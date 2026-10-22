import { InvoicePdf } from "./invoice-pdf";
import { formatMoney } from "./money";

/**
 * Facture commerciale / devis rendus en PDF côté serveur (page A4 595×842).
 * Le fond graphique reprend celui de l'aperçu #invoice-print : bandeau sombre,
 * table des lignes, encadré du total, mentions légales. Ce PDF est téléchargeable
 * en un clic depuis l'aperçu d'impression.
 */

export type CommercialDocType = "SALE" | "QUOTE";

export type CommercialDocInput = {
  type: CommercialDocType;
  reference: string;
  date: Date;
  company: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    taxId?: string | null;
    bankAccount?: string | null;
    mainActivities?: string | null;
  };
  customerName?: string | null;
  lines: { name: string; quantity: number; unitPrice: number }[];
  total: number;
  currency: string;
  statusLabel?: string | null;
  notes?: string | null;
  validUntil?: Date | null;
};

/** Espaces normalisés : ceux d'Intl (U+202F/U+2009) deviennent NBSP Latin-1. */
function flat(n: number, currency: string): string {
  return formatMoney(n, currency).replace(/[\u202F\u2009\u00A0]/g, "\u00A0");
}

const FMT_DATE = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

// Palette alignée sur l'aperçu web.
const INK = "0.09 0.12 0.20"; // slate-900
const INDIGO_TXT = "0.50 0.63 0.96"; // indigo-300
const MUTED = "0.39 0.45 0.55"; // slate-500
const BODY = "0.12 0.16 0.25";
const LIGHT = "0.94 0.96 0.99"; // slate-100
const INDIGO_BG = "0.91 0.92 0.99"; // indigo-50

export function buildCommercialPdf(doc: CommercialDocInput): Buffer {
  const pdf = new InvoicePdf();
  const isQuote = doc.type === "QUOTE";

  // 1. Bandeau sombre en tête (pleine largeur, 90 pt de haut, galbe du haut de page).
  pdf.rect(0, 842 - 90, 595, 90, INK);
  pdf.startAt(842 - 32);
  pdf.text(doc.company.name, { size: 15, bold: true, color: "1 1 1", gap: 14 });
  pdf.text(
    [doc.company.address, doc.company.phone].filter(Boolean).join(" - ") || "",
    { size: 8, color: INDIGO_TXT, gap: 10 }
  );
  pdf.at(842 - 26, () => {
    pdf.text(isQuote ? "DEVIS" : "FACTURE", {
      size: 11, bold: true, color: INDIGO_TXT, rightAt: 555, noAdvance: true,
    });
  });
  pdf.at(842 - 42, () => {
    pdf.text(doc.reference, {
      size: 10, bold: true, color: "1 1 1", rightAt: 555, noAdvance: true,
    });
  });
  pdf.startAt(842 - 118);

  // 2. Bloc client + date
  pdf.text("Client", { size: 7.5, bold: true, color: MUTED, gap: 4 });
  pdf.text(doc.customerName || "Client anonyme", { size: 11, bold: true, color: BODY, gap: 10 });
  pdf.at(842 - 118, () => {
    pdf.text(`Date : ${FMT_DATE(doc.date)}`, {
      size: 9, color: MUTED, rightAt: 555, noAdvance: true,
    });
  });
  if (doc.statusLabel) {
    pdf.at(842 - 130, () => {
      pdf.text(doc.statusLabel as string, { size: 8.5, color: "0.23 0.51 0.96", rightAt: 555, noAdvance: true });
    });
  }

  // 3. Tableau des lignes, fond d'en-tête passé en rect
  pdf.spacer(8);
  const tableTop = pdf.getCursorY() + 14; // hauteur d'en-tête de table
  pdf.rect(40, tableTop, 515, 18, LIGHT);
  pdf.at(tableTop + 5.5, () => {
    pdf.text("Article", { size: 8, bold: true, color: "0.30 0.36 0.46", noAdvance: true });
    pdf.text("Qté", { size: 8, bold: true, color: "0.30 0.36 0.46", rightAt: 360, noAdvance: true });
    pdf.text("Prix unitaire", { size: 8, bold: true, color: "0.30 0.36 0.46", rightAt: 465, noAdvance: true });
    pdf.text("Total", { size: 8, bold: true, color: "0.30 0.36 0.46", rightAt: 555, noAdvance: true });
  });
  pdf.spacer(4);
  pdf.startAt(pdf.getCursorY() - 4);
  for (const l of doc.lines) {
    pdf.text(l.name, { size: 9.5, color: BODY, noAdvance: true });
    pdf.text(String(l.quantity), { size: 9.5, color: MUTED, rightAt: 360, noAdvance: true });
    pdf.text(flat(l.unitPrice, doc.currency), { size: 9.5, color: MUTED, rightAt: 465, noAdvance: true });
    pdf.text(flat(l.unitPrice * l.quantity, doc.currency), {
      size: 9.5, bold: true, color: BODY, rightAt: 555, noAdvance: true,
    });
    pdf.spacer(14);
    pdf.line();
  }

  // 4. Encadré du total
  const totalBoxH = 36;
  const totalBoxY = pdf.getCursorY() - 8 - totalBoxH;
  pdf.rect(375, totalBoxY, 180, totalBoxH, INDIGO_BG);
  pdf.at(totalBoxY + 13, () => {
    pdf.text(isQuote ? "TOTAL ESTIME" : "TOTAL A PAYER", {
      size: 9, bold: true, color: "0.30 0.34 0.65", indent: 385, noAdvance: true,
    });
  });
  pdf.at(totalBoxY + 8, () => {
    pdf.text(flat(doc.total, doc.currency), {
      size: 13, bold: true, color: "0.20 0.26 0.60", rightAt: 545, noAdvance: true,
    });
  });

  // 5. Notes
  pdf.startAt(totalBoxY - 14);
  if (doc.notes) {
    for (const raw of doc.notes.split("\n").slice(0, 8)) {
      pdf.text(raw.slice(0, 110), { size: 9, color: "0.29 0.33 0.41", gap: 5 });
    }
  }

  // 6. Mentions légales + pied de page
  const footY = 92;
  const legal: string[] = [];
  if (doc.company.mainActivities) legal.push(`Activite : ${doc.company.mainActivities}`);
  if (doc.company.taxId) legal.push(`NIF / Identifiant fiscal : ${doc.company.taxId}`);
  if (doc.company.bankAccount)
    legal.push(`Coordonnees bancaires : ${doc.company.bankAccount}`);
  for (let i = 0; i < Math.min(3, legal.length); i++) {
    const item = legal[i] as string;
    pdf.at(footY + 22 - i * 11, () => {
      pdf.text(item.slice(0, 120), { size: 7.5, color: MUTED, noAdvance: true, gap: 5 });
    });
  }  pdf.at(76, () => {
    pdf.text(
      isQuote
        ? `Devis valable jusqu'a la date indiquee - Merci de votre confiance - ${doc.company.name}`
        : `Merci de votre confiance - ${doc.company.name}`,
      { size: 8, color: MUTED, rightAt: 555, noAdvance: true, gap: 5 }
    );
  });

  if (doc.validUntil) {
    pdf.at(66, () => {
      pdf.text(`Valable jusqu'au ${FMT_DATE(doc.validUntil as Date)}`, {
        size: 8, color: MUTED, noAdvance: true, indent: 40,
      });
    });
  }

  return pdf.build();
}
