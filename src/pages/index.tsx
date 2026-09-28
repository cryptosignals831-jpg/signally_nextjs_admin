import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Loader, Text } from '@mantine/core';
import { useFirestoreStoreAdmin } from '../models_store/firestore_store_admin';

export default function Index() {
  const { isAuthenticated, isInitialized } = useFirestoreStoreAdmin((state) => state);
  const router = useRouter();

  useEffect(() => {
    if (isInitialized) {
      if (isAuthenticated) router.push('/dashboard');
      else router.push('/signin');
    } else {
      const fallbackTimer = setTimeout(() => {
        if (!useFirestoreStoreAdmin.getState().isAuthenticated) {
          router.push('/signin');
        }
      }, 1200);
      return () => clearTimeout(fallbackTimer);
    }
  }, [isAuthenticated, isInitialized, router]);

  return (
    <Box className='flex flex-col items-center justify-center min-h-screen bg-[#141517] text-white'>
      <Loader size='md' color='yellow' />
      <Text size='sm' className='mt-4 text-gray-400'>
        Loading Maxpip Admin...
      </Text>
    </Box>
  );
}
