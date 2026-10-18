"use client";

import { Printer, X } from "lucide-react";
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
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="card my-8 w-full max-w-2xl p-6">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn-secondary !p-2" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div id="invoice-print" className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-bold">{company.name}</p>
              {company.address && <p className="text-sm text-slate-600">{company.address}</p>}
              {company.phone && <p className="text-sm text-slate-600">Tél. : {company.phone}</p>}
              {company.email && <p className="text-sm text-slate-600">{company.email}</p>}
              {company.taxId && (
                <p className="text-xs text-slate-500">NIF / Identifiant fiscal : {company.taxId}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold uppercase tracking-wide">{title}</p>
              <p className="font-mono text-sm">{reference}</p>
              <p className="text-sm text-slate-600">
                {new Date(date).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {statusLabel && <p className="mt-1 text-sm font-medium">{statusLabel}</p>}
            </div>
          </div>

          {customerName && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Client
              </p>
              <p className="text-sm font-medium">{customerName}</p>
            </div>
          )}

          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left">
                <th className="py-2">Article</th>
                <th className="py-2 text-center">Qté</th>
                <th className="py-2 text-right">Prix unitaire</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2">{l.name}</td>
                  <td className="py-2 text-center">{l.quantity}</td>
                  <td className="py-2 text-right">{formatMoney(l.unitPrice, currency)}</td>
                  <td className="py-2 text-right">{formatMoney(l.unitPrice * l.quantity, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300">
                <td colSpan={3} className="py-3 text-right font-semibold">
                  Total
                </td>
                <td className="py-3 text-right text-lg font-bold">{formatMoney(total, currency)}</td>
              </tr>
            </tfoot>
          </table>

          {notes && <p className="mt-4 whitespace-pre-wrap text-sm text-slate-600">{notes}</p>}

          <p className="mt-8 text-center text-xs text-slate-400">
            Merci de votre confiance. — {company.name}
          </p>
        </div>

        <button className="btn-primary mt-4 w-full print:hidden" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimer
        </button>
      </div>
    </div>
  );
}
