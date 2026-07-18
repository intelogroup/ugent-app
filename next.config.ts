import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "frame-src 'self' https://embed.liveavatar.com",
  "form-action 'self' https://*.workos.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss: blob: ws://localhost:8765",
  "media-src 'self' data: blob: https:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // ai and @ai-sdk/* ship ESM-only builds with no CJS entry point; Jest's
  // CJS runtime can't require() them directly, so they need SWC transform
  // (next/jest only transforms transpilePackages, not all of node_modules).
  transpilePackages: [
    'ai',
    '@ai-sdk/deepseek',
    '@ai-sdk/react',
    '@ai-sdk/gateway',
    '@ai-sdk/provider',
    '@ai-sdk/provider-utils',
    '@workflow/serde',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
