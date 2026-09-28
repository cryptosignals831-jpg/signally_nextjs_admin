import { Box, Card, Container, Divider, Group, Text } from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Headset } from 'tabler-icons-react';
import UserForm from '../../components/forms/UserForm';
import Page from '../../components/others/Page';
import UserSupportWorkspace from '../../components/support/UserSupportWorkspace';
import AuthGuard from '../../guards/AuthGuard';
import Layout from '../../layouts';
import { AuthUserModel } from '../../models/model.authuser';
import { apiGetUser } from '../../models_services/firestore_user_service';

export default function UserDetailPage() {
  const router = useRouter();
  const id = router.query.id as string;
  const [user, setUser] = useState<AuthUserModel | null>(null);

  useEffect(() => {
    if (id) {
      apiGetUser(id).then(setUser).catch(console.error);
    }
  }, [id]);

  return (
    <AuthGuard>
      <Layout variant='admin'>
        <Page title='User Details'>
          <Container size='xl' className='mb-24'>
            <Box className='flex flex-col w-full mx-auto mt-1 mb-8'>
              <Text className='text-2xl font-semibold leading-10'>User Management & Support Desk</Text>
              <Text size='xs' color='dimmed'>
                Inspect user credentials, update permissions, and manage their support tickets and real-time live chat.
              </Text>
            </Box>

            <UserForm id={id} />

            <Divider className='my-10 border-gray-200 dark:border-gray-800' />

            {/* Embedded Support Desk Workspace for this specific user */}
            <Card withBorder radius='md' p='lg' className='bg-white dark:bg-[#1A1B1E] shadow-sm'>
              <Group spacing='xs' className='mb-4'>
                <Headset size={22} className='text-app-yellow' />
                <Text className='text-xl font-bold'>Support Desk & Live Chat Hub</Text>
              </Group>

              {id && (
                <UserSupportWorkspace
                  userId={id}
                  userEmail={user?.email}
                  userName={user?.username}
                />
              )}
            </Card>
          </Container>
        </Page>
      </Layout>
    </AuthGuard>
  );
}
