"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = url ? new ConvexReactClient(url) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!client) {
    return (
      <div className="m-auto max-w-md p-6 text-center text-sm">
        Defina <code>NEXT_PUBLIC_CONVEX_URL</code> (rode{" "}
        <code>npx convex dev</code>) para carregar o painel.
      </div>
    );
  }
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
