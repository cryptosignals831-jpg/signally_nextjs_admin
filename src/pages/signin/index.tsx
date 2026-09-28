import { Container } from '@mantine/core';
import { GetStaticProps } from 'next';
import SignInForm from '../../components/forms/SignInForm';
import SignUpForm from '../../components/forms/SignUpForm';
import Page from '../../components/others/Page';
import Layout from '../../layouts';
import { firestoreAdmin } from '../../_firebase/firebase_admin';

interface Props {
  isSuperAdminConfigured?: boolean | null | undefined;
}

export default function SignInPage({ isSuperAdminConfigured }: Props) {
  return (
    <Layout variant='logoOnly'>
      <Page title='Signin'>
        <Container size='xl' className='flex items-center justify-center'>
          {isSuperAdminConfigured && <SignInForm />}
          {!isSuperAdminConfigured && <SignUpForm />}
        </Container>
      </Page>
    </Layout>
  );
}

export async function getServerSideProps(context: GetStaticProps) {
  let isSuperAdminConfigured = true;
  try {
    const appControl = await firestoreAdmin.collection('appControlsPrivate').doc('appControlsPrivate').get();
    if (appControl.exists) {
      isSuperAdminConfigured = appControl.data()?.isSuperAdminConfigured ?? true;
    }
  } catch (error) {
    console.error('Error fetching appControlsPrivate in signin:', error);
    isSuperAdminConfigured = true;
  }

  return {
    props: {
      isSuperAdminConfigured: isSuperAdminConfigured
    }
  };
}
