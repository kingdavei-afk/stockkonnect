"use client";

import { useState } from "react";
import { Download, CalendarRange, ChevronDown, AlertCircle } from "lucide-react";

const PERIODS = [
  { value: "30", label: "1 mois" },
  { value: "90", label: "3 derniers mois" },
  { value: "180", label: "6 derniers mois" },
  { value: "365", label: "12 derniers mois" },
];

const STATUS = [
  { value: "ALL", label: "Tous" },
  { value: "SUCCESS", label: "Payés" },
  { value: "PENDING", label: "En attente" },
  { value: "FAILED", label: "Échoués" },
];

export function AdminPaymentsExport({
  orgCount,
}: {
  orgCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState("30");
  const [status, setStatus] = useState<"ALL" | "SUCCESS" | "PENDING" | "FAILED">("ALL");
  const [error, setError] = useState<string | null>(null);
  const [downloads, setDownloads] = useState(0);

  async function run() {
    setBusy(true);
    setError(null);
    setDownloads(0);
    try {
      const params = new URLSearchParams({
        period: period,
        status: status,
      });
      const href = `/api/admin/payments?${params}`;
      await downloadCsv(href);
      setDownloads((d) => d + 1);
    } catch {
      setError("Échec de l'export. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative w-full sm:w-auto">
      <button
        type="button"
        className="btn-secondary w-full sm:w-auto flex items-center gap-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Exporter les paiements (CSV)"
      >
        <Download className="h-4 w-4" />
        Exporter les paiements
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CalendarRange className="h-4 w-4 text-indigo-600" />
              Filtres
            </p>
            {error && (
              <div className="mt-2 flex items-center gap-2 rounded-lg text-xs text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <div className="mt-3 space-y-3">
              <p className="text-xs font-medium text-slate-500">Période</p>
              <div className="grid grid-cols-4 gap-2">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                      period === p.value
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                    onClick={() => setPeriod(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs font-medium text-slate-500">Statut</p>
              <div className="flex flex-wrap gap-2">
                {STATUS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      status === s.value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    onClick={() => setStatus(s.value as typeof status)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn-primary mt-3 w-full"
                onClick={run}
                disabled={busy}
              >
                {busy ? "Export… " : "Télécharger CSV"}
              </button>
              <p className="text-xs text-slate-400">
                {downloads} export{ downloads > 1 ? "s" : "" } réalisé{ downloads > 1 ? "s" : "" }
                · {orgCount} entreprise(s) concernée{ orgCount > 1 ? "s" : "" }
                · {downloads > 0 ? "bouton cliqué" : "pas encore cliqué"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

async function downloadCsv(href: string) {
  const res = await fetch(href);
  if (!res.ok) throw new Error("export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const disposition = res.headers.get("Content-Disposition") ?? "";
  a.href = url;
  a.download = disposition.match(/filename="(.+)"/)?.[1] ?? "payements.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
