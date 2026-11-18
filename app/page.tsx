import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "Fiscaliz.ai · Você aponta. A cidade resolve.",
  description:
    "Relate buracos, postes apagados e outros problemas de Apucarana pelo WhatsApp. A IA encaminha para o órgão certo da Prefeitura e tudo aparece num mapa público.",
};

export default function Home() {
  return (
    <>
      <Header />
      <Landing />
    </>
  );
}
