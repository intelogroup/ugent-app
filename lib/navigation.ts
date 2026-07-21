import {
  HomeIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';

export const navigation = [
  { name: 'Dashboard',    shortName: 'Home',      href: '/dashboard',       icon: HomeIcon },
  { name: 'Create Test',  shortName: 'Quiz',      href: '/create-test',     icon: PlusCircleIcon },
  { name: 'My Tests',     shortName: 'Tests',     href: '/tests',           icon: ClipboardDocumentListIcon },
  { name: 'AI Analytics', shortName: 'Analytics', href: '/analytics',       icon: ChartBarIcon },
  { name: 'Strategy Hub',   shortName: 'Strategy',   href: '/strategy',        icon: AcademicCapIcon },
  { name: 'Curriculum',     shortName: 'Curriculum', href: '/curriculum',      icon: CalendarDaysIcon },
  { name: 'Leaderboard',    shortName: 'Rank',       href: '/leaderboard',     icon: TrophyIcon },
  { name: 'Disease Ref',  shortName: 'Diseases',  href: '/diseases',        icon: DocumentTextIcon },
  { name: 'Settings',     shortName: 'Settings',  href: '/settings',        icon: Cog6ToothIcon },
];
