"use client";

import { useState } from "react";
import { Download, Printer, X } from "lucide-react";
import { formatMoney } from "@/lib/money";

export type DocumentLine = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type CompanyInfo = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  bankAccount?: string | null;
  mainActivities?: string | null;
  /** Data URL du logo entreprise (facultatif). */
  logo?: string | null;
};

/**
 * Aperçu imprimable d'un document commercial (facture / reçu / devis).
 * L'élément #invoice-print est seul imprimé (règle @media print de globals.css).
 */
export function PrintableInvoice({
  title,
  reference,
  date,
  company,
  customerName,
  lines,
  total,
  currency,
  statusLabel,
  notes,
  validUntil,
  /** Identifiant du document côté serveur → active le bouton PDF. */
  documentId,
  /** Type de document : "SALE" pour une facture, "QUOTE" pour un devis. */
  documentType,
  onClose,
}: {
  title: string;
  reference: string;
  date: string;
  company: CompanyInfo;
  customerName?: string | null;
  lines: DocumentLine[];
  total: number;
  currency: string;
  statusLabel?: string;
  notes?: string | null;
  /** Devis seulement : date limite de validité. */
  validUntil?: string | null;
  documentId?: string | null;
  documentType?: "SALE" | "QUOTE";
  onClose: () => void;
}) {
  const initials = company.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  const isQuote = /devis/i.test(title);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  async function downloadPdf() {
    if (!documentId || !documentType) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      const res = await fetch("/api/documents/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: documentType, id: documentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Génération du PDF impossible");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${isQuote ? "devis" : "facture"}-${reference}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "Génération du PDF impossible");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="card my-8 w-full max-w-3xl p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn-secondary !p-2" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          id="invoice-print"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          {/* Bandeau d'en-tête */}
          <div className="flex items-stretch justify-between bg-slate-900 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              {company.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain p-0.5"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg font-bold tracking-tight">
                  {initials || "•"}
                </div>
              )}
              <div>
                <p className="text-base font-bold leading-tight">{company.name}</p>
                <p className="text-xs text-slate-300">
                  {[company.address, company.phone].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-300">
                {isQuote ? "Devis" : "Facture"}
              </p>
              <p className="font-mono text-sm font-semibold">{reference}</p>
            </div>
          </div>

          <div className="px-6 py-5">
            {/* Dates et statut */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Client
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {customerName || "Client anonyme"}
                </p>
                {company.email && (
                  <p className="mt-1 text-xs text-slate-500">{company.email}</p>
                )}
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-right ring-1 ring-slate-200">
                <p className="text-xs text-slate-500">
                  Date&nbsp;:{" "}
                  <span className="font-medium text-slate-800">
                    {new Date(date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </p>
                {validUntil && (
                  <p className="text-xs text-slate-500">
                    Valable jusqu&apos;au&nbsp;:{" "}
                    <span className="font-medium text-slate-800">
                      {new Date(validUntil).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </p>
                )}
                {statusLabel && (
                  <p className="mt-0.5">
                    <span className="badge bg-indigo-100 text-indigo-700">{statusLabel}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Tableau des lignes */}
            <table className="mt-5 w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="rounded-l-md px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Article
                  </th>
                  <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Qté
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Prix unitaire
                  </th>
                  <th className="rounded-r-md px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{l.name}</td>
                    <td className="px-3 py-2 text-center tabular-nums text-slate-600">
                      {l.quantity}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {formatMoney(l.unitPrice, currency)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-900">
                      {formatMoney(l.unitPrice * l.quantity, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div className="mt-4 flex justify-end">
              <div className="w-full max-w-xs rounded-lg bg-indigo-50 px-4 py-3 ring-1 ring-indigo-100">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold uppercase tracking-wide text-indigo-900">
                    Total {isQuote ? "estimé" : "à payer"}
                  </p>
                  <p className="text-lg font-bold text-indigo-900">
                    {formatMoney(total, currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes et mentions */}
            {notes && (
              <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{notes}</p>
              </div>
            )}

            {(company.taxId || company.bankAccount || company.mainActivities) && (
              <div className="mt-5 border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-slate-500">
                <p><span className="font-semibold text-slate-600">Activité :</span> {company.mainActivities || "—"}</p>
                <p><span className="font-semibold text-slate-600">NIF / Identifiant fiscal :</span> {company.taxId || "—"}</p>
                <p>
                  <span className="font-semibold text-slate-600">Coordonnées bancaires :</span>{" "}
                  {company.bankAccount || "—"}
                </p>
              </div>
            )}

            <p className="mt-5 border-t border-slate-200 pt-3 text-center text-xs text-slate-400">
              {isQuote
                ? `Devis valable jusqu'à la date indiquée — Thank you for your trust. — ${company.name}`
                : `Merci de votre confiance. — ${company.name}`}
            </p>
          </div>
        </div>

        {pdfError && (
          <p className="mt-2 text-center text-xs text-red-600 print:hidden">{pdfError}</p>
        )}

        <div className="mt-4 flex flex-col gap-2 print:hidden sm:flex-row sm:justify-end">
          {documentId && documentType && (
            <button
              className="btn-secondary"
              disabled={pdfLoading}
              onClick={downloadPdf}
            >
              <Download className="h-4 w-4" />
              {pdfLoading ? "Génération…" : "Télécharger le PDF"}
            </button>
          )}
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}
