"use client";

import { useState } from "react";
import { Download, CalendarRange, ChevronDown } from "lucide-react";

/** Télécharge en CSV le contenu d'une réponse `/api/export/*` sans recharger la page. */
export async function downloadCsv(href: string) {
  const res = await fetch(href);
  if (!res.ok) throw new Error("export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const disposition = res.headers.get("Content-Disposition") ?? "";
  a.href = url;
  a.download = disposition.match(/filename="(.+)"/)?.[1] ?? "export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Bouton qui télécharge un export CSV depuis un endpoint `/api/export/*`. */
export function ExportButton({ href, label = "Exporter CSV" }: { href: string; label?: string }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      await downloadCsv(href);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn-secondary w-full sm:w-auto" onClick={download} disabled={busy}>
      <Download className="h-4 w-4" />
      {busy ? "Export…" : label}
    </button>
  );
}

function firstOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function lastOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function iso(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Export des ventes avec filtre de période : ce mois, mois précédent ou plage personnalisée. */
export function SalesExportButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(range: { from?: string; to?: string }) {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);
      const qs = params.toString();
      await downloadCsv(`/api/export/sales${qs ? `?${qs}` : ""}`);
      setOpen(false);
    } catch {
      setError("Échec de l'export. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  function submitCustom() {
    if (!from || !to) {
      setError("Renseignez les deux dates.");
      return;
    }
    if (from > to) {
      setError("La date de début est après la date de fin.");
      return;
    }
    run({ from, to });
  }

  const inputCls = "input";

  return (
    <div className="relative w-full sm:w-auto">
      <button
        type="button"
        className="btn-secondary w-full sm:w-auto"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Download className="h-4 w-4" />
        Exporter CSV
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-full min-w-[260px] rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:w-72">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CalendarRange className="h-4 w-4 text-indigo-600" />
              Période
            </p>
            {error && (
              <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
            )}
            <div className="mt-3 space-y-2">
              <button
                type="button"
                className="btn-secondary w-full justify-start"
                disabled={busy}
                onClick={() => run({ from: iso(firstOfMonth()), to: iso(lastOfMonth()) })}
              >
                Ce mois ({firstOfMonth().toLocaleDateString("fr-FR", { month: "long" })})
              </button>
              <button
                type="button"
                className="btn-secondary w-full justify-start"
                disabled={busy}
                onClick={() => {
                  const ref = new Date();
                  ref.setDate(0); // dernier jour du mois précédent
                  run({ from: iso(firstOfMonth(ref)), to: iso(lastOfMonth(ref)) });
                }}
              >
                Mois précédent
              </button>
              <button
                type="button"
                className="btn-secondary w-full justify-start"
                disabled={busy}
                onClick={() => run({})}
              >
                Tout l'historique
              </button>
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-500">Plage personnalisée</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">Du</label>
                  <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <label className="label text-xs">Au</label>
                  <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
              <button type="button" className="btn-primary mt-3 w-full" disabled={busy} onClick={submitCustom}>
                {busy ? "Export…" : "Exporter la période"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
