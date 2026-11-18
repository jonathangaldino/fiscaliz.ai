import type { Metadata } from "next";
import { AddressReliability } from "@/components/AddressReliability";
import { AutomationMetrics } from "@/components/AutomationMetrics";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Confiabilidade · Fiscaliz.ai" };

export default function ReliabilityPage() {
  return (
    <>
      <Header />
      <main
        id="conteudo"
        className="mx-auto w-full max-w-5xl space-y-12 px-4 pt-6 pb-12 sm:px-6"
      >
        <h1 className="text-3xl font-semibold tracking-tight">Confiabilidade</h1>
        <AutomationMetrics />
        <AddressReliability />
      </main>
    </>
  );
}
