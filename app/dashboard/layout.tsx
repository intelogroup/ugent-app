import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = await withAuth();
  if (!user) redirect('/login');

  if (accessToken) {
    try {
      await fetchMutation(
        api.users.storeUser,
        {
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
          email: user.email ?? undefined,
          image: user.profilePictureUrl ?? undefined,
        },
        { token: accessToken },
      );
    } catch (err) {
      console.error('[storeUser]', err);
    }
  }

  return <>{children}</>;
}
