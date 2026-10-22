import { describe, it } from "node:test";
import { deepStrictEqual } from "node:assert";
import { formatMoney } from "../src/lib/money";

/**
 * Le formatage monétaire alimente les factures et devis imprimables
 * (printable-invoice.tsx). Ces assertions verrouillent le comportement FCFA :
 * les XOF sont sans décimales et s'affichent avec le symbole "F CFA".
 */
describe("formatMoney (FCFA)", () => {
  it("affiche un entier en F CFA sans décimales", () => {
    deepStrictEqual(formatMoney(5000, "XOF"), "5\u202F000\u00A0F\u202FCFA");
  });

  it("arrondit les montants XOF à l'entier (aucune décimale)", () => {
    deepStrictEqual(formatMoney(1234.56, "XOF"), "1\u202F235\u00A0F\u202FCFA");
    deepStrictEqual(formatMoney(1234.5, "XOF"), "1\u202F235\u00A0F\u202FCFA");
    deepStrictEqual(formatMoney(1234.49, "XOF"), "1\u202F234\u00A0F\u202FCFA");
  });

  it("sépare les milliers avec une espace fine", () => {
    deepStrictEqual(formatMoney(1234567, "xof"), "1\u202F234\u202F567\u00A0F\u202FCFA");
  });

  it("affiche zéro sans décimales", () => {
    deepStrictEqual(formatMoney(0, "XOF"), "0\u00A0F\u202FCFA");
  });

  it("garde 2 décimales pour une devise à décimales (contraste)", () => {
    deepStrictEqual(formatMoney(1234.5, "EUR"), "1\u202F234,50\u00A0€");
  });
});

/**
 * Mini-suite « type facture » : le total est additionné ligne par ligne comme
 * dans PrintableInvoice puis rendu par formatMoney — c'est le montant affiché
 * dans l'encadré du total d'une facture/ devis en FCFA.
 */
describe("snapshot du total imprimable en FCFA", () => {
  const lines = [
    { name: "Cahiers", quantity: 12, unitPrice: 200 },
    { name: "Stylos", quantity: 30, unitPrice: 100 },
    { name: "Classeur A4", quantity: 5, unitPrice: 600 },
  ];

  it("rend le total FCFA attendu pour un panier type", () => {
    const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    // 12×200 = 2 400 ; 30×100 = 3 000 ; 5×600 = 3 000 → 8 400
    deepStrictEqual(formatMoney(total, "XOF"), "8\u202F400\u00A0F\u202FCFA");
  });

  it("calcule le total de chaque lignes comme la table imprimée", () => {
    deepStrictEqual(
      lines.map((l) => formatMoney(l.unitPrice * l.quantity, "XOF")),
      [
        "2\u202F400\u00A0F\u202FCFA",
        "3\u202F000\u00A0F\u202FCFA",
        "3\u202F000\u00A0F\u202FCFA"
      ]
    );
  });
});
