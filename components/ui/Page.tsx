import type { ReactNode } from "react";

/** Content column for pages without the map. */
export function Page({
  children,
  width = "md",
}: {
  children: ReactNode;
  width?: "md" | "lg";
}) {
  return (
    <main
      className={`mx-auto w-full space-y-5 px-4 pt-6 pb-12 sm:px-6 ${
        width === "lg" ? "max-w-3xl" : "max-w-2xl"
      }`}
    >
      {children}
    </main>
  );
}

/** Glass card for a block of content. */
export function Card({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={`glass-strong rounded-panel p-5 ${className}`}>
      {children}
    </Tag>
  );
}

/** Loading and empty states, announced to screen readers. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="py-10 text-center text-sm text-muted">
      {children}
    </p>
  );
}
