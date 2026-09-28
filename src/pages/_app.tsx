import { ColorScheme, ColorSchemeProvider, MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';

import { getCookie, setCookie } from 'cookies-next';
import { GetServerSidePropsContext, NextPage } from 'next';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { ReactElement, ReactNode, useEffect, useState } from 'react';
import MotionLazyContainer from '../components/framer_motion/MotionLazyContainer';

import '../../src/assets/styles/global-app.scss';

import { useFirestoreStoreAdmin } from '../models_store/firestore_store_admin';
import { initializeFirebaseClient } from '../_firebase/firebase_client';
import { Notifications } from '@mantine/notifications';

type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

interface MyAppProps extends AppProps {
  Component: NextPageWithLayout;
}

export default function App(props: MyAppProps & { colorScheme: ColorScheme }) {
  const { Component, pageProps } = props;
  const [colorScheme, setColorScheme] = useState<ColorScheme>(props.colorScheme);
  const getLayout = Component.getLayout ?? ((page) => page);

  const toggleColorScheme = (value?: ColorScheme) => {
    const nextColorScheme = value || (colorScheme === 'dark' ? 'light' : 'dark');
    setColorScheme(nextColorScheme);
    setCookie('mantine-color-scheme', nextColorScheme, { maxAge: 60 * 60 * 60 * 24 * 3000 });
  };

  useEffect(() => {
    const isDark = getCookie('mantine-color-scheme') || 'dark';
    if (isDark === 'dark') document.documentElement.classList.add('dark');
    if (isDark !== 'dark') document.documentElement.classList.remove('dark');
  }, [colorScheme]);

  const { streamAuthUserAdmin, streamFirebaseUser } = useFirestoreStoreAdmin((state) => state);
  const { isInitialized } = useFirestoreStoreAdmin((state) => state);

  async function _initializeFirebaseClientClient() {
    await initializeFirebaseClient();
    streamFirebaseUser();
  }

  useEffect(() => {
    _initializeFirebaseClientClient();
  }, []);

  useEffect(() => {
    streamAuthUserAdmin();
  }, [isInitialized]);


  return (
    <>
      <Head>
        <title>Maxpip</title>
        <meta name='viewport' content='minimum-scale=1, initial-scale=1, width=device-width' />
        <link rel='shortcut icon' href='/favicon.svg' />
      </Head>

      <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
        <ModalsProvider labels={{ confirm: 'Submit', cancel: 'Cancel' }}>
          <MantineProvider
            theme={{
              fontFamily: 'Nunito,Inter, sans-serif',
              fontFamilyMonospace: 'Nunito ,Inter, Monaco, Courier, monospace',
              headings: { fontFamily: 'Nunito,Inter, Greycliff CF, sans-serif' },
              colorScheme
            }}
            withGlobalStyles
            withNormalizeCSS
            withCSSVariables
          >
            <Notifications />
            <MotionLazyContainer>
              {/*  */}
              {getLayout(<Component {...pageProps} />)}
              {/*  */}
            </MotionLazyContainer>
          </MantineProvider>
        </ModalsProvider>
      </ColorSchemeProvider>
    </>
  );
}

App.getInitialProps = ({ ctx }: { ctx: GetServerSidePropsContext }) => ({
  colorScheme: getCookie('mantine-color-scheme', ctx) || 'dark'
});
