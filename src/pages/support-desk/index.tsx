import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  SegmentedControl,
  Table,
  Text,
  TextInput,
  ThemeIcon
} from '@mantine/core';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Messages, Refresh, Search, Trash } from 'tabler-icons-react';
import Page from '../../components/others/Page';
import AuthGuard from '../../guards/AuthGuard';
import Layout from '../../layouts';
import { SupportModel, SupportStatus } from '../../models/model.support';
import {
  apiDeleteSupportTicket,
  streamAllSupports
} from '../../models_services/firestore_support_service';
import { fDateTimeSuffix } from '../../utils/format_time';

export default function SupportDeskPage() {
  const router = useRouter();
  const queryStatus = (router.query.status as string) || 'all';

  const [supports, setSupports] = useState<SupportModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>(queryStatus);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync selected status from URL query if provided
  useEffect(() => {
    if (router.query.status) {
      setSelectedStatus(router.query.status as string);
    }
  }, [router.query.status]);

  // Real-time listener for all support tickets
  useEffect(() => {
    setLoading(true);
    const unsubscribe = streamAllSupports((tickets) => {
      setSupports(tickets);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return supports.filter((ticket) => {
      // Status filter
      if (selectedStatus !== 'all') {
        const ticketStatus = (ticket.status || 'open').toLowerCase();
        if (ticketStatus !== selectedStatus.toLowerCase()) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = ticket.name?.toLowerCase().includes(q);
        const emailMatch = ticket.email?.toLowerCase().includes(q);
        const subjectMatch = ticket.subject?.toLowerCase().includes(q);
        const idMatch = ticket.id?.toLowerCase().includes(q);
        const categoryMatch = ticket.category?.toLowerCase().includes(q);
        const lastMsgMatch = ticket.lastMessage?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !subjectMatch && !idMatch && !categoryMatch && !lastMsgMatch) {
          return false;
        }
      }

      return true;
    });
  }, [supports, selectedStatus, searchQuery]);

  // Counts for tabs
  const counts = useMemo(() => {
    const res = { all: supports.length, open: 0, in_progress: 0, resolved: 0, closed: 0, unread: 0 };
    supports.forEach((t) => {
      const s = (t.status || 'open').toLowerCase();
      if (s === 'open') res.open++;
      else if (s === 'in_progress') res.in_progress++;
      else if (s === 'resolved') res.resolved++;
      else if (s === 'closed') res.closed++;

      if (t.adminUnread) res.unread++;
    });
    return res;
  }, [supports]);

  const handleStatusTabChange = (val: string) => {
    setSelectedStatus(val);
    if (val === 'all') {
      router.push('/support-desk', undefined, { shallow: true });
    } else {
      router.push(`/support-desk?status=${val}`, undefined, { shallow: true });
    }
  };

  return (
    <AuthGuard>
      <Layout variant='admin'>
        <Page title='Support Desk - Maxpip Admin'>
          <Container size='xl' className='py-6'>
            {/* Header */}
            <Box className='flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-800'>
              <div>
                <Group spacing='xs'>
                  <ThemeIcon size={38} radius='md' className='bg-app-yellow text-black'>
                    <Messages size={24} />
                  </ThemeIcon>
                  <div>
                    <Text className='text-2xl font-bold tracking-tight'>Support Desk</Text>
                    <Text size='xs' color='dimmed'>
                      Live customer complaints, real-time status management & direct user chat
                    </Text>
                  </div>
                </Group>
              </div>

              {counts.unread > 0 && (
                <Badge
                  color='red'
                  variant='filled'
                  size='lg'
                  className='mt-3 md:mt-0 animate-pulse'
                  leftSection={<MessageCircle size={16} />}>
                  {counts.unread} New Message{counts.unread > 1 ? 's' : ''} Awaiting Reply
                </Badge>
              )}
            </Box>

            {/* Quick Metrics Bar */}
            <div className='grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6'>
              <MetricCard
                title='Total Cases'
                count={counts.all}
                color='gray'
                active={selectedStatus === 'all'}
                onClick={() => handleStatusTabChange('all')}
              />
              <MetricCard
                title='Open'
                count={counts.open}
                color='blue'
                active={selectedStatus === 'open'}
                onClick={() => handleStatusTabChange('open')}
              />
              <MetricCard
                title='In Progress'
                count={counts.in_progress}
                color='orange'
                active={selectedStatus === 'in_progress'}
                onClick={() => handleStatusTabChange('in_progress')}
              />
              <MetricCard
                title='Resolved'
                count={counts.resolved}
                color='teal'
                active={selectedStatus === 'resolved'}
                onClick={() => handleStatusTabChange('resolved')}
              />
              <MetricCard
                title='Closed'
                count={counts.closed}
                color='dark'
                active={selectedStatus === 'closed'}
                onClick={() => handleStatusTabChange('closed')}
              />
            </div>

            {/* Filter and Search Bar */}
            <Card shadow='sm' p='md' radius='md' withBorder className='mb-6'>
              <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                <SegmentedControl
                  value={selectedStatus}
                  onChange={handleStatusTabChange}
                  data={[
                    { label: `All (${counts.all})`, value: 'all' },
                    { label: `Open (${counts.open})`, value: 'open' },
                    { label: `In Progress (${counts.in_progress})`, value: 'in_progress' },
                    { label: `Resolved (${counts.resolved})`, value: 'resolved' },
                    { label: `Closed (${counts.closed})`, value: 'closed' }
                  ]}
                  size='sm'
                  radius='md'
                  className='w-full md:w-auto'
                />

                <TextInput
                  placeholder='Search by User, Email, Subject or Ticket ID...'
                  icon={<Search size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  size='sm'
                  radius='md'
                  className='w-full md:w-80'
                />
              </div>
            </Card>

            {/* Tickets Table */}
            <Card shadow='sm' p='0' radius='md' withBorder className='overflow-hidden'>
              <Table highlightOnHover verticalSpacing='md' horizontalSpacing='lg' className='min-w-full'>
                <thead className='bg-gray-50 dark:bg-gray-800/60'>
                  <tr>
                    <th style={{ width: '130px' }}>Ticket ID</th>
                    <th style={{ width: '130px' }}>Status</th>
                    <th>User / Client</th>
                    <th>Subject & Details</th>
                    <th>Last Message</th>
                    <th style={{ width: '160px' }}>Created</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className='text-center py-10'>
                        <Text color='dimmed'>Loading tickets in real-time...</Text>
                      </td>
                    </tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className='text-center py-12'>
                        <ThemeIcon size={48} radius='xl' color='gray' variant='light' className='mx-auto mb-2'>
                          <Messages size={24} />
                        </ThemeIcon>
                        <Text size='lg' weight={600}>
                          No Support Tickets Found
                        </Text>
                        <Text size='sm' color='dimmed'>
                          {selectedStatus !== 'all'
                            ? `No tickets currently match '${selectedStatus}'.`
                            : 'No user complaints or tickets have been submitted yet.'}
                        </Text>
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <TicketTableRow key={ticket.id} ticket={ticket} />
                    ))
                  )}
                </tbody>
              </Table>
            </Card>
          </Container>
        </Page>
      </Layout>
    </AuthGuard>
  );
}

/* ----------------------------- METRIC CARD ----------------------------- */

function MetricCard({
  title,
  count,
  color,
  active,
  onClick
}: {
  title: string;
  count: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      shadow='xs'
      p='sm'
      radius='md'
      withBorder
      onClick={onClick}
      className={`cursor-pointer transition-all hover:scale-[1.02] ${
        active ? 'border-app-yellow ring-2 ring-app-yellow/40 bg-app-yellow/5' : ''
      }`}>
      <Text size='xs' color='dimmed' weight={600} transform='uppercase'>
        {title}
      </Text>
      <Group position='apart' mt={4}>
        <Text size='xl' weight={700}>
          {count}
        </Text>
        <Badge color={color} variant='light' size='sm'>
          {title}
        </Badge>
      </Group>
    </Card>
  );
}

/* --------------------------- TICKET TABLE ROW --------------------------- */

function TicketTableRow({ ticket }: { ticket: SupportModel }) {
  const router = useRouter();
  const modals = useModals();

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in_progress':
        return (
          <Badge color='orange' variant='filled' size='sm'>
            In Progress
          </Badge>
        );
      case 'resolved':
        return (
          <Badge color='teal' variant='filled' size='sm'>
            Resolved
          </Badge>
        );
      case 'closed':
        return (
          <Badge color='gray' variant='filled' size='sm'>
            Closed
          </Badge>
        );
      case 'open':
      default:
        return (
          <Badge color='blue' variant='filled' size='sm'>
            Open
          </Badge>
        );
    }
  };

  const handleDelete = (ticketId: string) => {
    const modalId = modals.openModal({
      title: 'Delete Support Ticket?',
      centered: true,
      children: (
        <>
          <Text size='sm'>
            Are you sure you want to delete ticket #{ticketId.substring(0, 6).toUpperCase()}? This
            will remove the ticket and cannot be undone.
          </Text>
          <Box className='flex justify-end gap-2 mt-6'>
            <Button variant='outline' onClick={() => modals.closeModal(modalId)}>
              Cancel
            </Button>
            <Button
              color='red'
              onClick={async () => {
                modals.closeModal(modalId);
                try {
                  await apiDeleteSupportTicket(ticketId);
                  showNotification({
                    title: 'Ticket Deleted',
                    message: 'The support ticket has been removed.',
                    color: 'teal'
                  });
                } catch {
                  showNotification({
                    title: 'Error',
                    message: 'Failed to delete ticket.',
                    color: 'red'
                  });
                }
              }}>
              Delete Ticket
            </Button>
          </Box>
        </>
      )
    });
  };

  return (
    <tr
      key={ticket.id}
      className={`transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
        ticket.adminUnread ? 'bg-amber-50/60 dark:bg-amber-950/20 font-medium' : ''
      }`}
      onClick={() => router.push(`/support-desk/${ticket.id}`)}>
      {/* Ticket ID */}
      <td>
        <Group spacing='xs'>
          {ticket.adminUnread && (
            <span className='w-2 h-2 rounded-full bg-red-500 animate-pulse' title='New Message' />
          )}
          <Text size='xs' weight={700} className='font-mono text-gray-700 dark:text-gray-300'>
            #{ticket.id ? ticket.id.substring(0, 6).toUpperCase() : 'N/A'}
          </Text>
        </Group>
      </td>

      {/* Status */}
      <td>{getStatusBadge(ticket.status)}</td>

      {/* User Info */}
      <td>
        <Text size='sm' weight={600} className='text-gray-900 dark:text-white'>
          {ticket.name || 'Anonymous User'}
        </Text>
        <Text size='xs' color='dimmed'>
          {ticket.email || 'No email'}
        </Text>
      </td>

      {/* Subject & Category */}
      <td>
        <Group spacing={6} mb={2}>
          {ticket.category && (
            <Badge size='xs' variant='outline' color='gray'>
              {ticket.category}
            </Badge>
          )}
        </Group>
        <Text size='sm' weight={500} lineClamp={1} className='text-gray-800 dark:text-gray-200'>
          {ticket.subject || ticket.message || 'Support Request'}
        </Text>
      </td>

      {/* Last Message Preview */}
      <td>
        <Text size='xs' color='dimmed' lineClamp={1}>
          <span className='font-semibold text-gray-600 dark:text-gray-400'>
            {ticket.lastSender === 'admin' ? 'Support Desk: ' : 'User: '}
          </span>
          {ticket.lastMessage || ticket.message || '—'}
        </Text>
      </td>

      {/* Date */}
      <td>
        <Text size='xs' color='dimmed'>
          {ticket.timestampCreated ? fDateTimeSuffix(ticket.timestampCreated) : 'Recent'}
        </Text>
      </td>

      {/* Actions */}
      <td onClick={(e) => e.stopPropagation()}>
        <Group spacing='xs' position='center'>
          <Button
            size='xs'
            variant='light'
            color='yellow'
            leftIcon={<MessageCircle size={14} />}
            onClick={() => router.push(`/support-desk/${ticket.id}`)}>
            Chat
          </Button>
          <ThemeIcon
            size='md'
            radius='md'
            variant='subtle'
            color='red'
            className='cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/30'
            onClick={() => handleDelete(ticket.id)}>
            <Trash size={16} />
          </ThemeIcon>
        </Group>
      </td>
    </tr>
  );
}
