import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stockkonect — Gestion de stock",
  description:
    "Application SaaS de gestion de stock : produits, mouvements, ventes, approvisionnements, alertes.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
