import type { Metadata } from "next";
import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Mapa de ocorrências · Fiscaliz.ai" };

export default function MapPage() {
  return (
    <>
      <Header overlay />
      {/* useSearchParams needs a Suspense boundary for static rendering. */}
      <Suspense>
        <Dashboard />
      </Suspense>
    </>
  );
}
