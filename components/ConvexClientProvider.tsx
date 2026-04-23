"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

function normalizeConvexUrl(url: string | undefined): string {
  const candidate = (url ?? "https://dependable-clownfish-136.convex.cloud").trim();
  return candidate.replace(/^['"]+|['"]+$/g, "");
}

const convex = new ConvexReactClient(normalizeConvexUrl(process.env.NEXT_PUBLIC_CONVEX_URL));

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
