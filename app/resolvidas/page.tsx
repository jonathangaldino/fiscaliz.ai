import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { ResolvedList } from "@/components/ResolvedList";

export const metadata: Metadata = { title: "Ocorrências resolvidas · Fiscaliz.ai" };

export default function ResolvedPage() {
  return (
    <>
      <Header />
      <ResolvedList />
    </>
  );
}
