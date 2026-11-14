import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SimulatorChat } from "@/components/SimulatorChat";

export const metadata: Metadata = { title: "Simulador · Fiscaliz.ai" };

export default function SimulatorPage() {
  return (
    <>
      <Header />
      <SimulatorChat />
    </>
  );
}
