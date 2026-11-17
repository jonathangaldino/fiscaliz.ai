import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { PointerLight } from "@/components/PointerLight";

export const metadata: Metadata = {
  title: "Fiscaliz.ai",
  description: "Ocorrências urbanas de Apucarana, PR, relatadas pelos cidadãos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="ambient flex h-full flex-col">
        <a
          href="#conteudo"
          className="glass fixed top-3 left-3 z-50 -translate-y-24 rounded-full px-4 py-2.5 text-sm font-semibold transition-transform focus:translate-y-0"
        >
          Pular para o conteúdo
        </a>
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <PointerLight />
      </body>
    </html>
  );
}
