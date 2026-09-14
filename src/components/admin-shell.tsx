"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Boxes, ShieldAlert } from "lucide-react";

/** Coquille dédiée à la console super-admin (hors app organisation). */
export function AdminShell({
  userName,
  logout,
  children,
}: {
  userName: string;
  logout: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 bg-slate-900">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2 text-lg font-bold text-white">
            <Boxes className="h-6 w-6 text-indigo-400" />
            Stockkonect
            <span className="ml-2 flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
              <ShieldAlert className="h-3 w-3" />
              Plateforme
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-300 sm:inline">{userName}</span>
            <div className="[&_button]:!w-auto [&_button]:text-slate-300 [&_button:hover]:bg-slate-800 [&_button:hover]:text-white">
              {logout}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    </div>
  );
}
