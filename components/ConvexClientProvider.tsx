"use client";

import { ReactNode, useCallback, useState } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useAccessToken, useAuth } from "@workos-inc/authkit-nextjs/components";

function normalizeConvexUrl(url: string | undefined): string {
  const candidate = (url ?? "https://dependable-clownfish-136.convex.cloud").trim();
  return candidate.replace(/^['"]+|['"]+$/g, "");
}

function useAuthFromWorkOS() {
  const { user, loading } = useAuth();
  const { getAccessToken, refresh, loading: accessTokenLoading } = useAccessToken();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      const token = forceRefreshToken ? await refresh() : await getAccessToken();
      return token ?? null;
    },
    [getAccessToken, refresh],
  );

  return {
    isLoading: loading || accessTokenLoading,
    isAuthenticated: Boolean(user),
    fetchAccessToken,
  };
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(() => new ConvexReactClient(normalizeConvexUrl(process.env.NEXT_PUBLIC_CONVEX_URL)));

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuthFromWorkOS}>
      {children}
    </ConvexProviderWithAuth>
  );
}
