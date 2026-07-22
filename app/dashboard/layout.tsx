// Protected route — must never be edge-cached/prerendered, or middleware's
// auth/email-verification gate gets bypassed on cache hits (no `Vary: Cookie`
// on static output means anonymous requests get served the cached HTML).
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
