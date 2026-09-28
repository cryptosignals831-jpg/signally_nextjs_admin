import { ActionIcon, Box, Button, Container, Drawer, Group, Text, Tooltip } from '@mantine/core';
import { createColumnHelper } from '@tanstack/react-table';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { Edit, Headset } from 'tabler-icons-react';
import Page from '../../components/others/Page';
import UserSupportWorkspace from '../../components/support/UserSupportWorkspace';
import { BaseTable } from '../../components/tables/BaseTable';
import AuthGuard from '../../guards/AuthGuard';
import Layout from '../../layouts';
import { AuthUserModel } from '../../models/model.authuser';
import { useFirestoreStoreAdmin } from '../../models_store/firestore_store_admin';
import { fDate } from '../../utils/format_time';

export default function UsersIndexPage() {
  const authUsers = useFirestoreStoreAdmin((state) => state.authUsers);
  const router = useRouter();
  const access = (router.query.access as string) || '';

  const [selectedSupportUser, setSelectedSupportUser] = useState<AuthUserModel | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleOpenSupport = (user: AuthUserModel) => {
    setSelectedSupportUser(user);
    setDrawerOpen(true);
  };

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<AuthUserModel>();
    return [
      columnHelper.accessor('timestampCreated', {
        header: 'Created',
        cell: (info) => fDate(info.getValue())
      }),

      columnHelper.accessor('id', {
        header: 'User Id',
        cell: (info) => <Box className='flex items-center font-mono text-xs'>{info.row.original.id}</Box>
      }),

      columnHelper.accessor('isSuperAdmin', {
        header: `Super Admin`,
        cell: (info) => <Text>{info.getValue() ? 'Yes' : 'No'}</Text>
      }),
      columnHelper.accessor('isAdmin', {
        header: `Admin`,
        cell: (info) => <Text>{info.getValue() ? 'Yes' : 'No'}</Text>
      }),

      columnHelper.accessor('email', {
        header: 'Email',
        cell: (info) => <span className='font-medium'>{info.getValue() || '-'}</span>
      }),

      columnHelper.accessor('subIsLifetime', {
        header: `Lifetime sub`,
        cell: (info) => <Text>{info.getValue() ? 'Yes' : 'No'}</Text>
      }),
      columnHelper.accessor('getSubscriptionEndDate', {
        header: `Sub End`,
        cell: (info) => fDate(info.getValue())
      }),

      columnHelper.accessor('getHasSubscription', {
        header: `Has subscription`,
        cell: (info) => <Text>{info.getValue() ? 'Yes' : 'No'}</Text>
      }),

      columnHelper.accessor('userId', {
        header: 'Action',
        cell: (info) => (
          <Box className='flex items-center space-x-2'>
            <Tooltip label='Support Desk & Live Chat'>
              <ActionIcon
                size='sm'
                variant='light'
                color='yellow'
                onClick={() => handleOpenSupport(info.row.original)}>
                <Headset size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label='Edit User Profile'>
              <ActionIcon
                size='sm'
                variant='subtle'
                onClick={() => router.push(`/users/${info.row.original.id}`)}>
                <Edit size={16} className='text-app-yellow' />
              </ActionIcon>
            </Tooltip>
          </Box>
        )
      })
    ];
  }, [router]);

  const data = filterUsers();

  function filterUsers() {
    if (access === 'superadmin') return authUsers.filter((user) => user.isSuperAdmin === true);
    if (access === 'admin') return authUsers.filter((user) => user.isAdmin === true);
    if (access === 'subscriber') return authUsers.filter((user) => user.getHasSubscription === true);
    if (access === 'lifetime') return authUsers.filter((user) => user.subIsLifetime === true);
    return authUsers;
  }

  return (
    <AuthGuard>
      <Layout variant='admin'>
        <Page title='Users'>
          <Container size='xl' className='mb-20'>
            <Box className='flex flex-wrap items-center justify-between mt-1 mb-5 gap-3'>
              <Box>
                <Text className='text-2xl font-semibold leading-10 cursor-pointer'>Users Directory</Text>
                <Text size='xs' color='dimmed'>Manage traders, subscriptions, and direct support desk interactions.</Text>
              </Box>

              <Group spacing='sm'>
                <Link href='/support-desk' passHref>
                  <Button
                    component='a'
                    size='sm'
                    leftIcon={<Headset size={16} />}
                    className='text-black bg-app-yellow hover:bg-opacity-90'>
                    Support Desk Console
                  </Button>
                </Link>
              </Group>
            </Box>

            <BaseTable data={data} columns={columns} />

            {/* Slide-over Support Desk Drawer */}
            <Drawer
              opened={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              title={
                <Group spacing='xs'>
                  <Headset size={20} className='text-app-yellow' />
                  <Text className='font-bold text-lg'>
                    Support Desk: {selectedSupportUser?.email || selectedSupportUser?.id}
                  </Text>
                </Group>
              }
              padding='lg'
              size='xl'
              position='right'>
              {selectedSupportUser && (
                <UserSupportWorkspace
                  userId={selectedSupportUser.id}
                  userEmail={selectedSupportUser.email}
                  userName={selectedSupportUser.username}
                  onClose={() => setDrawerOpen(false)}
                />
              )}
            </Drawer>
          </Container>
        </Page>
      </Layout>
    </AuthGuard>
  );
}
