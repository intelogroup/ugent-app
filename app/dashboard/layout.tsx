import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await withAuth();
  if (!user) redirect('/login');

  return <>{children}</>;
}
