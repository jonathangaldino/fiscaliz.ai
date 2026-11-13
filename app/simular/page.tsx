import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SimulatorChat } from "@/components/SimulatorChat";

export const metadata: Metadata = { title: "Simulador · Fiscaliza.i" };

export default function SimulatorPage() {
  return (
    <>
      <Header />
      <SimulatorChat />
    </>
  );
}
