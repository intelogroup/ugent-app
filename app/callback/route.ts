import { handleAuth } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';

const authCallbackHandler = handleAuth({
  returnPathname: '/dashboard',
  onError: async ({ request }) => {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'auth_callback_failed');
    return NextResponse.redirect(loginUrl);
  },
});

export async function GET(request: NextRequest) {
  if (!request.nextUrl.searchParams.get('code')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(loginUrl);
  }

  return authCallbackHandler(request);
}
