import type { Metadata } from "next";
import { AddressReliability } from "@/components/AddressReliability";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Confiabilidade do endereço · Fiscaliz.ai" };

export default function ReliabilityPage() {
  return (
    <>
      <Header />
      <AddressReliability />
    </>
  );
}
