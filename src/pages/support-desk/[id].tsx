import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  Text,
  TextInput,
  ThemeIcon
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CircleCheck,
  Clock,
  Mail,
  MessageCircle,
  Messages,
  Send,
  User,
  X
} from 'tabler-icons-react';
import Page from '../../components/others/Page';
import AuthGuard from '../../guards/AuthGuard';
import Layout from '../../layouts';
import { SupportMessageModel, SupportModel, SupportStatus } from '../../models/model.support';
import { useFirestoreStoreAdmin } from '../../models_store/firestore_store_admin';
import {
  apiMarkSupportReadByAdmin,
  apiSendAdminMessage,
  apiUpdateSupportStatus,
  streamSupportMessages,
  streamSupportTicket
} from '../../models_services/firestore_support_service';
import { fDateTimeSuffix } from '../../utils/format_time';

export default function SupportTicketDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const ticketId = typeof id === 'string' ? id : '';

  const authUser = useFirestoreStoreAdmin((state) => state.authUser);

  const [ticket, setTicket] = useState<SupportModel | null>(null);
  const [messages, setMessages] = useState<SupportMessageModel[]>([]);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Synthesize initial complaint message if messages subcollection is not yet populated
  const displayMessages = useMemo(() => {
    if (messages.length === 0 && ticket?.message) {
      const initialMsg = new SupportMessageModel();
      initialMsg.id = 'initial-complaint';
      initialMsg.ticketId = ticket.id;
      initialMsg.senderId = ticket.userId || 'user';
      initialMsg.senderName = ticket.name || 'Client';
      initialMsg.senderRole = 'user';
      initialMsg.text = ticket.message;
      initialMsg.timestamp = ticket.timestampCreated || new Date();
      initialMsg.isRead = true;
      return [initialMsg];
    }
    return messages;
  }, [messages, ticket]);

  // Stream single ticket document
  useEffect(() => {
    if (!ticketId) return;
    setLoadingTicket(true);

    const unsubTicket = streamSupportTicket(ticketId, (doc) => {
      setTicket(doc);
      setLoadingTicket(false);

      // Auto-mark as read by admin
      if (doc?.adminUnread) {
        apiMarkSupportReadByAdmin(ticketId);
      }
    });

    const unsubMessages = streamSupportMessages(ticketId, (msgs) => {
      setMessages(msgs);
    });

    return () => {
      unsubTicket();
      unsubMessages();
    };
  }, [ticketId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  const handleStatusChange = async (newStatus: string | null) => {
    if (!newStatus || !ticketId) return;
    setUpdatingStatus(true);
    try {
      await apiUpdateSupportStatus(ticketId, newStatus as SupportStatus);
      showNotification({
        title: 'Status Updated',
        message: `Ticket status successfully changed to ${newStatus.toUpperCase()}`,
        color: 'teal',
        icon: <Check size={16} />
      });
    } catch {
      showNotification({
        title: 'Update Failed',
        message: 'Could not change ticket status.',
        color: 'red',
        icon: <X size={16} />
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !ticketId || sending) return;

    setSending(true);
    const text = replyText.trim();
    setReplyText('');

    const adminName = authUser?.username || (authUser?.email ? authUser.email.split('@')[0] : 'Support Desk');
    const adminId = authUser?.id || undefined;

    try {
      await apiSendAdminMessage(ticketId, text, adminName, adminId);
      showNotification({
        title: 'Reply Sent',
        message: 'Your message was delivered to the user.',
        color: 'teal',
        autoClose: 2500
      });
    } catch (error) {
      console.error(error);
      setReplyText(text); // restore if failed
      showNotification({
        title: 'Failed to Send',
        message: 'Could not deliver your reply. Please try again.',
        color: 'red'
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in_progress':
        return (
          <Badge color='orange' variant='filled' size='md' leftSection={<Clock size={12} />}>
            In Progress
          </Badge>
        );
      case 'resolved':
        return (
          <Badge color='teal' variant='filled' size='md' leftSection={<CircleCheck size={12} />}>
            Resolved
          </Badge>
        );
      case 'closed':
        return (
          <Badge color='gray' variant='filled' size='md'>
            Closed
          </Badge>
        );
      case 'open':
      default:
        return (
          <Badge color='blue' variant='filled' size='md'>
            Open
          </Badge>
        );
    }
  };

  return (
    <AuthGuard>
      <Layout variant='admin'>
        <Page title={ticket ? `Ticket #${ticketId.substring(0, 6).toUpperCase()} - Support Desk` : 'Support Ticket'}>
          <Container size='xl' className='py-6'>
            {/* Top Bar / Navigation */}
            <Box className='flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-800 gap-4'>
              <Group spacing='sm'>
                <ActionIcon
                  size='lg'
                  variant='light'
                  radius='md'
                  onClick={() => router.push('/support-desk')}
                  className='hover:bg-slate-100 dark:hover:bg-slate-800'>
                  <ArrowLeft size={20} />
                </ActionIcon>
                <div>
                  <Group spacing='xs'>
                    <Text className='text-2xl font-bold font-mono'>
                      #{ticketId.substring(0, 6).toUpperCase()}
                    </Text>
                    {ticket && getStatusBadge(ticket.status)}
                    {ticket?.adminUnread && (
                      <Badge color='red' variant='dot'>
                        New Message
                      </Badge>
                    )}
                  </Group>
                  <Text size='xs' color='dimmed'>
                    Created {ticket?.timestampCreated ? fDateTimeSuffix(ticket.timestampCreated) : 'Recently'}
                  </Text>
                </div>
              </Group>

              {/* Status Selector Dropdown */}
              <Group spacing='xs'>
                <Text size='sm' weight={600} className='text-gray-700 dark:text-gray-300'>
                  Ticket Status:
                </Text>
                <Select
                  value={ticket?.status || 'open'}
                  onChange={handleStatusChange}
                  disabled={updatingStatus || !ticket}
                  size='sm'
                  radius='md'
                  data={[
                    { value: 'open', label: 'Open' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'closed', label: 'Closed' }
                  ]}
                  className='w-44'
                />
              </Group>
            </Box>

            {loadingTicket ? (
              <Box className='flex flex-col items-center justify-center py-24'>
                <Loader size='lg' color='yellow' />
                <Text size='sm' color='dimmed' mt='md'>
                  Loading support ticket details...
                </Text>
              </Box>
            ) : !ticket ? (
              <Card shadow='sm' p='xl' radius='md' withBorder className='text-center py-16'>
                <ThemeIcon size={48} radius='xl' color='red' variant='light' className='mx-auto mb-3'>
                  <X size={24} />
                </ThemeIcon>
                <Text size='lg' weight={700}>
                  Ticket Not Found
                </Text>
                <Text size='sm' color='dimmed' mb='md'>
                  This ticket may have been deleted or the ID is invalid.
                </Text>
                <Button variant='outline' onClick={() => router.push('/support-desk')}>
                  Back to Support Desk
                </Button>
              </Card>
            ) : (
              <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                {/* Left Column: User & Case Metadata Card */}
                <div className='lg:col-span-1 space-y-4'>
                  <Card shadow='sm' p='md' radius='md' withBorder>
                    <Text size='xs' weight={700} color='dimmed' transform='uppercase' mb='xs'>
                      Client Information
                    </Text>

                    <div className='space-y-3'>
                      <Group spacing='xs' noWrap>
                        <ThemeIcon size='md' radius='md' variant='light' color='gray'>
                          <User size={16} />
                        </ThemeIcon>
                        <div>
                          <Text size='sm' weight={600}>
                            {ticket.name || 'Anonymous User'}
                          </Text>
                          <Text size='xs' color='dimmed'>
                            Name
                          </Text>
                        </div>
                      </Group>

                      <Group spacing='xs' noWrap>
                        <ThemeIcon size='md' radius='md' variant='light' color='gray'>
                          <Mail size={16} />
                        </ThemeIcon>
                        <div>
                          <Text size='sm' weight={600} className='break-all'>
                            {ticket.email || 'No email provided'}
                          </Text>
                          <Text size='xs' color='dimmed'>
                            Email Address
                          </Text>
                        </div>
                      </Group>

                      {ticket.userId && (
                        <div className='pt-2 border-t border-gray-100 dark:border-gray-800'>
                          <Text size='xs' color='dimmed'>
                            User ID (Firebase):
                          </Text>
                          <Text size='xs' className='font-mono break-all text-gray-700 dark:text-gray-300'>
                            {ticket.userId}
                          </Text>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Complaint Details Card */}
                  <Card shadow='sm' p='md' radius='md' withBorder>
                    <Text size='xs' weight={700} color='dimmed' transform='uppercase' mb='xs'>
                      Complaint Summary
                    </Text>

                    <div className='space-y-3'>
                      <div>
                        <Text size='xs' color='dimmed'>
                          Category:
                        </Text>
                        <Badge size='sm' variant='outline' color='yellow' mt={2}>
                          {ticket.category || 'General'}
                        </Badge>
                      </div>

                      <div>
                        <Text size='xs' color='dimmed'>
                          Subject:
                        </Text>
                        <Text size='sm' weight={600}>
                          {ticket.subject || 'Support Ticket'}
                        </Text>
                      </div>

                      <div>
                        <Text size='xs' color='dimmed'>
                          Initial Description:
                        </Text>
                        <Paper
                          p='xs'
                          radius='sm'
                          className='mt-1 bg-gray-50 dark:bg-gray-800/80 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto'>
                          {ticket.message || 'No description provided.'}
                        </Paper>
                      </div>
                    </div>
                  </Card>

                  {/* Quick Status Action Buttons */}
                  <Card shadow='sm' p='md' radius='md' withBorder>
                    <Text size='xs' weight={700} color='dimmed' transform='uppercase' mb='xs'>
                      Quick Status Actions
                    </Text>
                    <div className='grid grid-cols-2 gap-2'>
                      <Button
                        size='xs'
                        variant='light'
                        color='orange'
                        onClick={() => handleStatusChange('in_progress')}
                        disabled={ticket.status === 'in_progress'}>
                        Set In Progress
                      </Button>
                      <Button
                        size='xs'
                        variant='light'
                        color='teal'
                        onClick={() => handleStatusChange('resolved')}
                        disabled={ticket.status === 'resolved'}>
                        Set Resolved
                      </Button>
                      <Button
                        size='xs'
                        variant='light'
                        color='gray'
                        onClick={() => handleStatusChange('closed')}
                        disabled={ticket.status === 'closed'}>
                        Set Closed
                      </Button>
                      <Button
                        size='xs'
                        variant='light'
                        color='blue'
                        onClick={() => handleStatusChange('open')}
                        disabled={ticket.status === 'open'}>
                        Reopen Ticket
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Right Column: Live Chat Interface */}
                <div className='lg:col-span-2'>
                  <Card shadow='sm' p='0' radius='md' withBorder className='flex flex-col h-[650px]'>
                    {/* Chat Header */}
                    <Box className='p-4 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between'>
                      <Group spacing='xs'>
                        <ThemeIcon size='md' radius='md' color='yellow' className='bg-app-yellow text-black'>
                          <Messages size={18} />
                        </ThemeIcon>
                        <div>
                          <Text size='sm' weight={600}>
                            Live Conversation
                          </Text>
                          <Text size='xs' color='dimmed'>
                            Real-time chat with {ticket.name || 'User'}
                          </Text>
                        </div>
                      </Group>

                      <Badge color='green' variant='dot' size='sm'>
                        Real-time Connected
                      </Badge>
                    </Box>

                    {/* Chat Messages Body */}
                    <ScrollArea className='flex-1 p-4 bg-slate-50/50 dark:bg-slate-900/30' offsetScrollbars>
                      {displayMessages.length === 0 ? (
                        <Box className='flex flex-col items-center justify-center py-20 text-center'>
                          <ThemeIcon size={44} radius='xl' color='gray' variant='light' mb='sm'>
                            <MessageCircle size={22} />
                          </ThemeIcon>
                          <Text size='sm' weight={600} color='dimmed'>
                            No messages in this chat yet.
                          </Text>
                          <Text size='xs' color='dimmed'>
                            Type a reply below to reach out to the user directly.
                          </Text>
                        </Box>
                      ) : (
                        <div className='space-y-3'>
                          {displayMessages.map((msg) => {
                            const isAdmin = msg.senderRole === 'admin';
                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                <div className='flex items-center space-x-1.5 mb-1 px-1'>
                                  <Text size='xs' weight={600} color={isAdmin ? 'yellow' : 'dimmed'}>
                                    {isAdmin ? 'Support Desk (You)' : msg.senderName || ticket.name || 'User'}
                                  </Text>
                                  <Text size='xs' color='dimmed'>
                                    • {msg.timestamp ? fDateTimeSuffix(msg.timestamp) : 'Just now'}
                                  </Text>
                                </div>

                                <Paper
                                  p='sm'
                                  radius='md'
                                  className={`max-w-[80%] text-sm ${
                                    isAdmin
                                      ? 'bg-app-yellow text-black font-medium rounded-tr-none shadow-sm'
                                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none shadow-sm border border-gray-200 dark:border-gray-700'
                                  }`}>
                                  <Text size='sm' className='whitespace-pre-wrap break-words'>
                                    {msg.text}
                                  </Text>
                                </Paper>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </ScrollArea>

                    <Divider />

                    {/* Chat Input Footer */}
                    <form onSubmit={handleSendMessage} className='p-3 bg-white dark:bg-gray-900'>
                      <Group spacing='xs' noWrap>
                        <TextInput
                          placeholder='Type your response to the user...'
                          value={replyText}
                          onChange={(e) => setReplyText(e.currentTarget.value)}
                          disabled={sending}
                          radius='md'
                          size='md'
                          className='flex-1'
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <Button
                          type='submit'
                          size='md'
                          radius='md'
                          loading={sending}
                          disabled={!replyText.trim()}
                          className='bg-app-yellow text-black hover:bg-yellow-400 font-semibold px-5'
                          rightIcon={<Send size={16} />}>
                          Send
                        </Button>
                      </Group>
                    </form>
                  </Card>
                </div>
              </div>
            )}
          </Container>
        </Page>
      </Layout>
    </AuthGuard>
  );
}
