import type { Metadata } from "next";
import { AutomationMetrics } from "@/components/AutomationMetrics";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Métricas · Fiscaliz.ai" };

export default function MetricsPage() {
  return (
    <>
      <Header />
      <AutomationMetrics />
    </>
  );
}
