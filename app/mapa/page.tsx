import type { Metadata } from "next";
import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Mapa de ocorrências · Fiscaliz.ai" };

export default function MapPage() {
  return (
    // Positioned box so the overlay header sits below the hackathon banner.
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Header overlay />
      {/* useSearchParams needs a Suspense boundary for static rendering. */}
      <Suspense>
        <Dashboard />
      </Suspense>
    </div>
  );
}
