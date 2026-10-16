import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stockkonect — Gestion de stock",
  description:
    "Application SaaS de gestion de stock : produits, mouvements, ventes, approvisionnements, alertes.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/stockkonect-mark.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Stockkonect",
    statusBarStyle: "default",
  },
  // Next ne génère jamais ce tag Apple ; iOS en a besoin pour le mode standalone
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
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
