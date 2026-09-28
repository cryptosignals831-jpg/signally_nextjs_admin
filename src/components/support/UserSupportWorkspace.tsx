import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  Headset,
  MessageCircle,
  Plus,
  Send
} from 'tabler-icons-react';
import { SupportMessageModel, SupportModel, SupportStatus } from '../../models/model.support';
import {
  apiCreateAdminTicketForUser,
  apiMarkSupportReadByAdmin,
  apiSendAdminMessage,
  apiUpdateSupportStatus,
  streamSupportMessages,
  streamTicketsForUser
} from '../../models_services/firestore_support_service';
import { useFirestoreStoreAdmin } from '../../models_store/firestore_store_admin';
import { fDateTimeSuffix } from '../../utils/format_time';

interface UserSupportWorkspaceProps {
  userId: string;
  userEmail?: string;
  userName?: string;
  onClose?: () => void;
}

const statusColorMap: Record<string, string> = {
  open: 'yellow',
  in_progress: 'orange',
  resolved: 'teal',
  closed: 'gray'
};

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
];

export default function UserSupportWorkspace({
  userId,
  userEmail = '',
  userName = '',
  onClose
}: UserSupportWorkspaceProps) {
  const authUser = useFirestoreStoreAdmin((state) => state.authUser);
  const [tickets, setTickets] = useState<SupportModel[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Messages state for selected ticket
  const [messages, setMessages] = useState<SupportMessageModel[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // New ticket modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('General Inquiry');
  const [newMessage, setNewMessage] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Stream tickets for this user
  useEffect(() => {
    setLoadingTickets(true);
    const unsubscribe = streamTicketsForUser(userId, userEmail, (userTickets) => {
      setTickets(userTickets);
      setLoadingTickets(false);

      // Auto-select first ticket if none selected
      if (userTickets.length > 0) {
        setSelectedTicketId((prev) => {
          if (!prev || !userTickets.some((t) => t.id === prev)) {
            return userTickets[0].id;
          }
          return prev;
        });
      } else {
        setSelectedTicketId(null);
      }
    });

    return () => unsubscribe();
  }, [userId, userEmail]);

  // Selected ticket
  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  // Stream messages for selected ticket
  useEffect(() => {
    if (!selectedTicketId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const unsubscribe = streamSupportMessages(selectedTicketId, (msgs) => {
      setMessages(msgs);
      setLoadingMessages(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    // Mark as read by admin
    apiMarkSupportReadByAdmin(selectedTicketId).catch(() => {});

    return () => unsubscribe();
  }, [selectedTicketId]);

  // Handle status change
  const handleStatusChange = async (newStatus: SupportStatus) => {
    if (!selectedTicketId) return;
    try {
      setUpdatingStatus(true);
      await apiUpdateSupportStatus(selectedTicketId, newStatus);
      showNotification({
        title: 'Status Updated',
        message: `Ticket status set to ${newStatus.replace('_', ' ').toUpperCase()}`,
        color: 'teal'
      });
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message: err?.message || 'Failed to update status',
        color: 'red'
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle send admin reply
  const handleSendReply = async () => {
    if (!selectedTicketId || !replyText.trim()) return;
    try {
      setSendingReply(true);
      const adminName = authUser?.username || authUser?.email || 'Support Admin';
      await apiSendAdminMessage(
        selectedTicketId,
        replyText.trim(),
        authUser?.id || 'admin',
        adminName
      );
      setReplyText('');
    } catch (err: any) {
      showNotification({
        title: 'Send Error',
        message: err?.message || 'Could not send message',
        color: 'red'
      });
    } finally {
      setSendingReply(false);
    }
  };

  // Handle create new ticket
  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      showNotification({
        title: 'Validation',
        message: 'Please provide both a subject and an initial message.',
        color: 'yellow'
      });
      return;
    }

    try {
      setCreatingTicket(true);
      const adminName = authUser?.username || authUser?.email || 'Support Admin';
      const createdId = await apiCreateAdminTicketForUser({
        userId,
        email: userEmail,
        name: userName,
        subject: newSubject.trim(),
        category: newCategory,
        message: newMessage.trim(),
        adminName
      });

      showNotification({
        title: 'Ticket Created',
        message: 'Support conversation started with user.',
        color: 'teal'
      });

      setCreateModalOpen(false);
      setNewSubject('');
      setNewMessage('');
      setSelectedTicketId(createdId);
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message: err?.message || 'Failed to create ticket',
        color: 'red'
      });
    } finally {
      setCreatingTicket(false);
    }
  };

  // Synthesize display messages: ensure initial inquiry is rendered
  const displayMessages = [...messages];
  if (displayMessages.length === 0 && activeTicket && activeTicket.message) {
    const synthetic = new SupportMessageModel();
    synthetic.id = 'init';
    synthetic.senderRole = 'user';
    synthetic.senderName = activeTicket.name || activeTicket.email || 'Trader';
    synthetic.text = activeTicket.message;
    synthetic.timestamp = activeTicket.timestampCreated || new Date();
    displayMessages.unshift(synthetic);
  }

  return (
    <Box className='flex flex-col h-full'>
      {/* Header Info */}
      <Box className='flex items-center justify-between pb-3 mb-3 border-b border-gray-200 dark:border-gray-800'>
        <Box>
          <Group spacing='xs'>
            <Headset size={20} className='text-app-yellow' />
            <Text className='font-bold text-md'>Support Desk for {userEmail || userId}</Text>
          </Group>
          <Text size='xs' color='dimmed'>
            User UID: <span className='font-mono'>{userId}</span>
          </Text>
        </Box>

        <Group spacing='xs'>
          <Button
            size='xs'
            leftIcon={<Plus size={14} />}
            variant='filled'
            className='text-black bg-app-yellow hover:bg-opacity-90'
            onClick={() => setCreateModalOpen(true)}>
            New Ticket
          </Button>
          <Link href={`/support-desk?search=${encodeURIComponent(userEmail || userId)}`} passHref>
            <Button
              component='a'
              size='xs'
              variant='outline'
              color='gray'
              leftIcon={<ExternalLink size={14} />}>
              Full Desk
            </Button>
          </Link>
        </Group>
      </Box>

      {/* Main Content Area */}
      {loadingTickets ? (
        <Box className='flex items-center justify-center py-12'>
          <Loader size='sm' color='yellow' />
          <Text size='sm' className='ml-3'>
            Loading user support tickets...
          </Text>
        </Box>
      ) : tickets.length === 0 ? (
        <Card withBorder className='py-8 text-center bg-gray-50 dark:bg-[#1E2024]'>
          <MessageCircle size={36} className='mx-auto text-gray-400' />
          <Text className='mt-2 font-medium'>No support tickets found for this user</Text>
          <Text size='xs' color='dimmed' className='max-w-md mx-auto mt-1'>
            This user has not submitted any complaints yet. You can start a proactive support
            conversation with them right now.
          </Text>
          <Button
            size='sm'
            leftIcon={<Plus size={16} />}
            variant='light'
            color='yellow'
            className='mt-4'
            onClick={() => setCreateModalOpen(true)}>
            Start New Support Conversation
          </Button>
        </Card>
      ) : (
        <Box className='grid grid-cols-1 gap-4 md:grid-cols-12'>
          {/* Left Column: Ticket Selector List */}
          <Box className='space-y-2 md:col-span-4 max-h-[500px] overflow-y-auto pr-1'>
            {tickets.map((t) => {
              const isSelected = t.id === selectedTicketId;
              const status = (t.status || 'open').toLowerCase();
              return (
                <Card
                  key={t.id}
                  withBorder
                  p='sm'
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? 'border-app-yellow bg-yellow-50/10 dark:bg-yellow-900/10'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                  <Box className='flex items-center justify-between'>
                    <Badge size='xs' color={statusColorMap[status] || 'gray'}>
                      {status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {t.adminUnread && (
                      <Badge size='xs' color='red' variant='filled'>
                        NEW REPLY
                      </Badge>
                    )}
                  </Box>
                  <Text className='mt-1 font-semibold text-sm line-clamp-1'>
                    {t.subject || 'Support Inquiry'}
                  </Text>
                  <Text size='xs' color='dimmed' className='line-clamp-2 mt-0.5'>
                    {t.lastMessage || t.message || 'No messages'}
                  </Text>
                  <Text size='10px' color='dimmed' className='mt-1 text-right'>
                    {fDateTimeSuffix(t.timestampUpdated || t.timestampCreated)}
                  </Text>
                </Card>
              );
            })}
          </Box>

          {/* Right Column: Live Chat Workspace */}
          <Box className='flex flex-col md:col-span-8 bg-gray-50 dark:bg-[#1A1B1E] border border-gray-200 dark:border-gray-800 rounded-md p-3'>
            {activeTicket ? (
              <>
                {/* Active Ticket Status Bar */}
                <Box className='flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-gray-200 dark:border-gray-800 gap-2'>
                  <Box>
                    <Text className='font-bold text-sm'>{activeTicket.subject}</Text>
                    <Text size='xs' color='dimmed'>
                      Category: {activeTicket.category || 'General'} | Case #{activeTicket.id.slice(0, 8)}
                    </Text>
                  </Box>

                  <Group spacing='xs'>
                    <Text size='xs' className='font-semibold'>
                      Status:
                    </Text>
                    <Select
                      size='xs'
                      value={(activeTicket.status || 'open').toLowerCase()}
                      data={statusOptions}
                      disabled={updatingStatus}
                      onChange={(val) => val && handleStatusChange(val as SupportStatus)}
                      className='w-32'
                    />
                    <Link href={`/support-desk/${activeTicket.id}`} passHref>
                      <Tooltip label='Open dedicated ticket page'>
                        <ActionIcon component='a' size='sm' variant='light' color='yellow'>
                          <ExternalLink size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Link>
                  </Group>
                </Box>

                {/* Messages Feed */}
                <Box className='flex-1 overflow-y-auto max-h-[340px] min-h-[220px] space-y-2.5 p-2 bg-white dark:bg-[#141517] rounded border border-gray-100 dark:border-gray-800'>
                  {loadingMessages ? (
                    <Box className='flex items-center justify-center h-32'>
                      <Loader size='sm' color='yellow' />
                    </Box>
                  ) : displayMessages.length === 0 ? (
                    <Text size='xs' color='dimmed' className='py-8 text-center'>
                      No messages in this chat yet. Type a reply below.
                    </Text>
                  ) : (
                    displayMessages.map((m, idx) => {
                      const isAdmin = m.senderRole === 'admin';
                      return (
                        <Box
                          key={m.id || idx}
                          className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                          <Box
                            className={`max-w-[85%] rounded-lg p-2.5 text-xs shadow-sm ${
                              isAdmin
                                ? 'bg-amber-500 text-black font-medium'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                            }`}>
                            <Box className='flex items-center justify-between gap-2 mb-1 opacity-80 font-bold text-[10px]'>
                              <span>{isAdmin ? '🛡️ ADMIN DESK' : m.senderName || 'CLIENT'}</span>
                              <span>{fDateTimeSuffix(m.timestamp)}</span>
                            </Box>
                            <Text className='whitespace-pre-wrap'>{m.text}</Text>
                          </Box>
                        </Box>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Reply Composer */}
                <Box className='flex items-center gap-2 mt-2.5'>
                  <TextInput
                    placeholder='Type response to user...'
                    size='sm'
                    className='flex-1'
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    disabled={sendingReply}
                  />
                  <Button
                    size='sm'
                    className='text-black bg-app-yellow hover:bg-opacity-90'
                    onClick={handleSendReply}
                    loading={sendingReply}
                    leftIcon={<Send size={14} />}>
                    Send
                  </Button>
                </Box>
              </>
            ) : (
              <Box className='flex items-center justify-center h-48'>
                <Text size='sm' color='dimmed'>
                  Select a ticket from the left to view the live chat.
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Modal: Create New Ticket for User */}
      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={<Text className='font-bold'>Open Support Conversation with {userEmail || userId}</Text>}>
        <Stack spacing='sm'>
          <TextInput
            label='Subject / Topic'
            placeholder='e.g., Account Verification Assistance'
            required
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
          />
          <Select
            label='Category'
            data={[
              'General Inquiry',
              'Signals & Execution',
              'Account & Profile',
              'Technical & App Issue',
              'Trading Tools & Calcs'
            ]}
            value={newCategory}
            onChange={(val) => setNewCategory(val || 'General Inquiry')}
          />
          <Textarea
            label='Message to User'
            placeholder='Enter message. This will appear instantly in the user’s mobile app under Support Desk...'
            required
            minRows={4}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Group position='right' className='mt-3'>
            <Button variant='default' onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className='text-black bg-app-yellow hover:bg-opacity-90'
              loading={creatingTicket}
              onClick={handleCreateTicket}
              leftIcon={<Send size={14} />}>
              Send & Open Ticket
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
