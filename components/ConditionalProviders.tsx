'use client';

import { usePathname } from 'next/navigation';
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
import type { ReactNode } from 'react';

const PUBLIC_PREFIXES = ['/', '/login', '/signup', '/auth'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) =>
    prefix === '/' ? pathname === '/' : pathname.startsWith(prefix),
  );
}

export function ConditionalProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  return <AuthKitProvider>{children}</AuthKitProvider>;
}
