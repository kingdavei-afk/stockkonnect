import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockKonect — Le stock juste, au bon moment",
  description:
    "Gérez produits, ventes, approvisionnements et alertes simplement. Essayez StockKonect gratuitement pendant 7 jours.",
  icons: { icon: "/stockkonect-mark.svg" },
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
