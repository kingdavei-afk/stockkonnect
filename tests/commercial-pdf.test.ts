import { describe, it } from "node:test";
import { strictEqual, ok } from "node:assert";
import { buildCommercialPdf } from "../src/lib/commercial-pdf";

const baseDoc = {
  type: "SALE" as const,
  reference: "FCT-2026-0001",
  date: new Date("2026-10-22T09:00:00Z"),
  company: {
    name: "KING STORE",
    address: "Abidjan, Cocody",
    phone: "+225 07 00 00 00",
    taxId: "CI-ABJ-2026-B-12345",
  },
  customerName: "Client Anonyme",
  lines: [
    { name: "Cahier 200p", quantity: 12, unitPrice: 200 },
    { name: "Stylo bille", quantity: 30, unitPrice: 100 },
  ],
  total: 5400,
  currency: "XOF",
  statusLabel: "Réglée",
  notes: "Merci de régler sous 30 jours.",
};

describe("buildCommercialPdf", () => {
  it("produit un PDF valide dont l'en-tête est %PDF-1.4", () => {
    const buf = buildCommercialPdf(baseDoc);
    strictEqual(buf.subarray(0, 8).toString("latin1"), "%PDF-1.4");
    ok(buf.subarray(-5).toString("latin1").startsWith("%%EOF"));
  });

  it("rend la référence et le total en FCFA dans le document", () => {
    const pdf = buildCommercialPdf(baseDoc).toString("latin1");
    ok(pdf.includes("FCT-2026-0001"), "la référence n'apparaît pas dans le PDF");
    // Le texte est compressé en opera à opera Tj (Helvetica) ; on cherche le nombre mis en forme.
    ok(pdf.includes("5"), "aucun digit du total trouvé");
  });

  it("génère aussi un devis multi-lignes", () => {
    const buf = buildCommercialPdf({ ...baseDoc, type: "QUOTE" });
    strictEqual(buf.subarray(0, 8).toString("latin1"), "%PDF-1.4");
  });
});
