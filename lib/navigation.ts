import {
  HomeIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  TrophyIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  BeakerIcon,
  ChartBarIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

export const navigation = [
  { name: 'Dashboard',    shortName: 'Home',      href: '/dashboard',       icon: HomeIcon },
  { name: 'Research',     shortName: 'Research',  href: '/research/ingest', icon: BeakerIcon },
  { name: 'Create Test',  shortName: 'Quiz',      href: '/create-test',     icon: PlusCircleIcon },
  { name: 'My Tests',     shortName: 'Tests',     href: '/tests',           icon: ClipboardDocumentListIcon },
  { name: 'AI Analytics', shortName: 'Analytics', href: '/analytics',       icon: ChartBarIcon },
  { name: 'Strategy Hub', shortName: 'Strategy',  href: '/strategy',        icon: AcademicCapIcon },
  { name: 'Leaderboard',  shortName: 'Board',     href: '/leaderboard',     icon: TrophyIcon },
  { name: 'Study Notes',  shortName: 'Notes',     href: '/notes',           icon: BookOpenIcon },
  { name: 'Settings',     shortName: 'Settings',  href: '/settings',        icon: Cog6ToothIcon },
  { name: 'Pricing',      shortName: 'Pricing',   href: '/pricing',         icon: CreditCardIcon },
];
