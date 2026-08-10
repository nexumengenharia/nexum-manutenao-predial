import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SCRIPT_APARENCIA } from "@/lib/aparencia";

export const metadata: Metadata = {
  title: "Nexum · Gestão de Manutenção Predial",
  description:
    "Sistema de gestão de manutenção predial, patrimonial e de frota para tribunais e órgãos públicos.",
};

/* Sem isto o Android/iOS renderiza a pagina numa viewport virtual de 980px e
   depois encolhe tudo — o que faz o sistema "caber" no celular mas ilegivel. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_APARENCIA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
