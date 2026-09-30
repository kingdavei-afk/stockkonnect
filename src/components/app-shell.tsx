"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { Boxes, Menu, X, LifeBuoy, MessageCircle, BookOpen, CreditCard } from "lucide-react";

const baseLinks = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/products", label: "Produits" },
  { href: "/movements", label: "Mouvements" },
  { href: "/sales", label: "Ventes" },
  { href: "/purchases", label: "Approvisionnements" },
  { href: "/customers", label: "Clients" },
  { href: "/categories", label: "Catégories" },
  { href: "/suppliers", label: "Fournisseurs" },
];

const adminLinks = [
  { href: "/users", label: "Utilisateurs" },
  { href: "/settings", label: "Paramètres" },
];

const WHATSAPP_URL =
  "https://wa.me/2250748323191?text=" +
  encodeURIComponent("Bonjour Stockkonect, j'ai besoin d'aide !");
const GUIDE_URL = "/guide-stockkonect.pdf";

function NavLinks({
  onNavigate,
  isAdmin,
}: {
  onNavigate?: () => void;
  isAdmin: boolean;
}) {
  const links = isAdmin ? [...baseLinks, ...adminLinks] : [...baseLinks];
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function UserBlock({ userName, organizationName }: { userName: string; organizationName: string }) {
  return (
    <div className="border-b border-slate-800 px-6 py-3">
      <p className="truncate text-sm font-semibold text-white" title={userName}>
        {userName}
      </p>
      <p className="truncate text-xs text-slate-400" title={organizationName}>
        {organizationName}
      </p>
    </div>
  );
}

function ToolsSection({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-t border-slate-800 px-3 pb-3 pt-4">
      <p className="flex items-center gap-2 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <LifeBuoy className="h-3.5 w-3.5" />
        Outils et Assistance
      </p>
      <Link
        href="/plans"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-indigo-900/40 hover:text-indigo-300"
      >
        <CreditCard className="h-4 w-4 text-indigo-400" />
        Abonnements
      </Link>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-emerald-900/40 hover:text-emerald-300"
      >
        <MessageCircle className="h-4 w-4 text-emerald-400" />
        Besoin d&apos;aide ? Cliquez ici
      </a>
      <a
        href={GUIDE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-indigo-900/40 hover:text-indigo-300"
      >
        <BookOpen className="h-4 w-4 text-indigo-400" />
        Apprendre Stockkonect
      </a>
    </div>
  );
}

function SidebarBottom({ logout, onNavigate }: { logout: ReactNode; onNavigate?: () => void }) {
  return (
    <>
      <ToolsSection onNavigate={onNavigate} />
      <div className="border-t border-slate-800 p-3">{logout}</div>
    </>
  );
}

export function AppShell({
  userName,
  organizationName,
  role,
  logout,
  children,
}: {
  userName: string;
  organizationName: string;
  role: string;
  logout: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isAdmin = role === "ADMIN";

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen">
      {/* Barre supérieure mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-slate-900 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2 text-lg font-bold text-white">
          <Boxes className="h-6 w-6 text-indigo-400" />
          Stockkonect
        </div>
        <button
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-slate-900 lg:flex">
          <div className="flex items-center gap-2 px-6 py-5 text-lg font-bold text-white">
            <Boxes className="h-6 w-6 text-indigo-400" />
            Stockkonect
          </div>
          {/* Nom de l'admin connecté + entreprise */}
          <UserBlock userName={userName} organizationName={organizationName} />
          <NavLinks isAdmin={isAdmin} />
          <SidebarBottom logout={logout} />
        </aside>

        {/* Drawer mobile */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-slate-900 shadow-xl">
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-2 text-lg font-bold text-white">
                  <Boxes className="h-6 w-6 text-indigo-400" />
                  Stockkonect
                </div>
                <button
                  className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                  onClick={() => setOpen(false)}
                  aria-label="Fermer le menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <UserBlock userName={userName} organizationName={organizationName} />
              <NavLinks onNavigate={() => setOpen(false)} isAdmin={isAdmin} />
              <SidebarBottom logout={logout} onNavigate={() => setOpen(false)} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
