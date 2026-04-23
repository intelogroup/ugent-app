import { ConvexHttpClient } from 'convex/browser';

function normalizeConvexUrl(url: string | undefined): string {
  if (!url) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
  }

  return url.trim().replace(/^['"]+|['"]+$/g, '');
}

export function getConvexClient(): ConvexHttpClient {
  return new ConvexHttpClient(normalizeConvexUrl(process.env.NEXT_PUBLIC_CONVEX_URL));
}
