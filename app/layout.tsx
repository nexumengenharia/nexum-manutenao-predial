import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexum · Gestão de Manutenção Predial",
  description:
    "Sistema de gestão de manutenção predial, patrimonial e de frota para tribunais e órgãos públicos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
