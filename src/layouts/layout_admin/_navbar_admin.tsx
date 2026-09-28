import { Divider, Navbar, ScrollArea, Text } from '@mantine/core';
import { useRouter } from 'next/router';
import Iconify from '../../components/others/Iconify';

interface Props {
  isOpen: boolean;
}

interface INavarLink {
  link: string;
  title: string;
  iconifyData?: string;
}
export function NavbarAdmin({ isOpen }: Props) {
  const router = useRouter();

  return (
    <Navbar p={2} hiddenBreakpoint='md' hidden={!isOpen} width={{ md: 240, lg: 270 }} className=''>
      <Navbar.Section grow component={ScrollArea} type='always' className='pt-2'>
        <NavbarLink link='/dashboard' title='Dashboard' iconifyData='ri:dashboard-3-fill' />
        <Divider className='my-3 border-gray-200 dark:border-[#373A40]' />

        <NavbarLink link='/signals-crypto' title='Signals: Crypto' iconifyData='akar-icons:edit' />
        <NavbarLinkSub link='/signals-crypto?isClosed=false' title='Open' />
        <NavbarLinkSub link='/signals-crypto?isClosed=true' title='Closed' />

        <Divider className='my-3 border-gray-200 dark:border-[#373A40]' />

        <NavbarLink link='/signals-forex' title='Signals: Forex' iconifyData='akar-icons:edit' />
        <NavbarLinkSub link='/signals-forex?isClosed=false' title='Open' />
        <NavbarLinkSub link='/signals-forex?isClosed=true' title='Closed' />

        <Divider className='my-3 border-gray-200 dark:border-[#373A40]' />

        <NavbarLink link='/signals-stocks' title='Signals: Stocks ' iconifyData='akar-icons:edit' />
        <NavbarLinkSub link='/signals-stocks?isClosed=false' title='Open' />
        <NavbarLinkSub link='/signals-stocks?isClosed=true' title='Closed' />

        <Divider className='my-3 border-gray-200 dark:border-[#373A40]' />

        <NavbarLink link='/users' title='Users' iconifyData='majesticons:users-line' />
        <NavbarLinkSub link='/users?access=superadmin' title='Super Admins' />
        <NavbarLinkSub link='/users?access=admin' title='Admins' />
        <NavbarLinkSub link='/users?access=lifetime' title='Lifetime' />
        <NavbarLinkSub link='/users?access=subscriber' title='Subscibers' />

        <Divider className='my-3 border-gray-200 dark:border-[#373A40]' />

        <NavbarLink link='/support-desk' title='Support Desk' iconifyData='fluent:chat-help-24-filled' />
        <NavbarLinkSub link='/support-desk?status=open' title='Open' />
        <NavbarLinkSub link='/support-desk?status=in_progress' title='In Progress' />
        <NavbarLinkSub link='/support-desk?status=resolved' title='Resolved' />
        <NavbarLinkSub link='/support-desk?status=closed' title='Closed' />

        <Divider className='my-3 border-gray-200 dark:border-[#373A40]' />

        <NavbarLink link='/announcements' title='Announcements' iconifyData='mdi:announcement-outline' />
        <NavbarLink link='/video-lessons' title='Video Lessons' iconifyData='material-symbols:video-call' />
        <NavbarLink link='/posts' title='Posts' iconifyData='jam:blogger-square' />

        <Divider className='my-3 border-gray-200 dark:border-[#373A40]' />

        <NavbarLink link='/config-appcontrols' title='Configure App settings' iconifyData='dashicons:admin-links' />
        <NavbarLink link='/config-terms' title='Configure Terms' iconifyData='uil:info-circle' />
        <NavbarLink link='/config-privacy' title='Configure Privacy' iconifyData='material-symbols:privacy-tip-rounded' />
        <NavbarLink link='/config-smtp' title='Configure SMTP' iconifyData='material-symbols:alternate-email-rounded' />
        <NavbarLink link='/config-links' title='Configure Links' iconifyData='dashicons:admin-links' />

        <Divider className='my-3 border-gray-200 dark:border-[#373A40]' />
        <NavbarLink link='/config-api-access' title='Configure API Access (Paid)' iconifyData='dashicons:admin-links' />
      </Navbar.Section>
    </Navbar>
  );
}

/* ------------------------------- NOTE LINKS ------------------------------- */
function NavbarLink({ link, title, iconifyData = '' }: INavarLink) {
  const router = useRouter();
  const active = router.pathname == link;

  return (
    <div onClick={() => router.push(link)} className='flex px-4 py-1 transition-all cursor-pointer hover:bg-slate-100 hover:dark:bg-slate-800'>
      <Iconify icon={iconifyData} className='w-[24px] h-[20px]  ' />
      <Text className={`${active ? 'font-bold' : ''} ml-4 transition-all`}>{title}</Text>
    </div>
  );
}

function NavbarLinkSub({ link, title }: INavarLink) {
  const router = useRouter();
  const active = router.pathname == link;

  return (
    <div
      onClick={() => router.push(link)}
      className='flex cursor-pointer hover:bg-slate-100 hover:dark:bg-slate-800 pl-[60px] py-[1.5px]  transition-all'>
      <Text className={`${active ? 'font-bold' : ''} transition-all`}>{title}</Text>
    </div>
  );
}
