// Génère public/guide-stockflow.pdf (guide d'utilisation en français)
// Usage : node scripts/generate-guide.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "guide-stockflow.pdf");

// --- PDF helpers (PDF 1.4 minimal, Helvetica/WinAnsi) ---
const latin1 = (s) =>
  [...s].map((ch) => (ch.codePointAt(0) <= 255 ? ch : "?")).join("");

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

class Pdf {
  constructor() {
    this.pages = [];
    this.current = [];
    this.y = 780;
  }
  get ops() {
    return this.current;
  }
  text(str, { size = 11, bold = false, indent = 0, gap = 8, color = "0 0 0" } = {}) {
    if (this.y < 60) return; // évite de déborder (contenu court maîtrisé)
    const font = bold ? "/F2" : "/F1";
    this.current.push(
      "BT",
      `${color} rg`,
      `${font} ${size} Tf`,
      `1 0 0 1 ${40 + indent} ${this.y} Tm`,
      `(${esc(latin1(str))}) Tj`,
      "ET"
    );
    this.y -= size + gap;
  }
  line() {
    this.y -= 6;
    this.current.push("0.8 0.8 0.9 RG", "0.7 w", `40 ${this.y} m 555 ${this.y} l`, "S");
    this.y -= 14;
  }
  spacer(h = 8) {
    this.y -= h;
  }
  pageBreak() {
    this.pages.push(this.current);
    this.current = [];
    this.y = 780;
  }
  build(title, subtitle) {
    this.pages.push(this.current);
    const objects = [];
    const pageIds = [];
    const contentIds = [];
    // 1 = catalog, 2 = pages, 3 = font regular, 4 = font bold, then per page: page obj + content obj
    let nextId = 5;
    for (const ops of this.pages) {
      const pageId = nextId++;
      const contentId = nextId++;
      pageIds.push(pageId);
      contentIds.push({ id: contentId, ops });
    }
    objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
    objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
    objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
    objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
    for (const { id, ops } of contentIds) {
      const stream = ops.join("\n");
      objects[id] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    }
    pageIds.forEach((pageId, i) => {
      const contentId = pageId + 1;
      objects[pageId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    });

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let id = 1; id < objects.length; id++) {
      offsets[id] = pdf.length;
      pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id++) {
      pdf += String(offsets[id]).padStart(10, "0") + " 00000 n \n";
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(pdf, "latin1");
  }
}

// --- contenu du guide ---
const doc = new Pdf();

doc.text("StockFlow - Guide d'utilisation", { size: 22, bold: true, gap: 4 });
doc.text("Documentation officielle - gestion de stock pour votre entreprise", {
  size: 11,
  color: "0.35 0.35 0.45",
  gap: 14,
});
doc.line();

doc.text("1. Demarrer", { size: 14, bold: true });
doc.text("- Connectez-vous avec votre email et mot de passe.", { indent: 10 });
doc.text("- Le tableau de bord affiche la valeur du stock, les ventes,", { indent: 10 });
doc.text("  les achats du mois et les alertes de stock bas.", { indent: 10 });
doc.text("- Si votre entreprise est suspendue, contactez le support.", { indent: 10 });
doc.spacer(6);

doc.text("2. Produits", { size: 14, bold: true });
doc.text("- Creez un produit : nom, SKU unique, code-barres, prix de vente,", { indent: 10 });
doc.text("  cout d'achat, quantite initiale et seuil d'alerte.", { indent: 10 });
doc.text("- Ajoutez une photo et imprimez l'etiquette code-barres.", { indent: 10 });
doc.text("- La recherche filtre par nom, SKU ou code-barres.", { indent: 10 });
doc.spacer(6);

doc.text("3. Mouvements de stock", { size: 14, bold: true });
doc.text("- Entree : reception de marchandise (augmente le stock).", { indent: 10 });
doc.text("- Sortie : perte, casse ou don (diminue le stock).", { indent: 10 });
doc.text("- Ajustement : correction de l'inventaire (delta signe).", { indent: 10 });
doc.text("- L'historique conserve chaque operation avec son auteur.", { indent: 10 });
doc.spacer(6);

doc.text("4. Ventes et approvisionnements", { size: 14, bold: true });
doc.text("- Nouvelle vente : selectionnez les articles, le stock est", { indent: 10 });
doc.text("  decrementee automatiquement. Annuler restaure le stock.", { indent: 10 });
doc.text("- Approvisionnement : receptionnez du stock, le cout d'achat", { indent: 10 });
doc.text("  alimente la valorisation de l'inventaire.", { indent: 10 });
doc.spacer(6);

doc.text("5. Exports CSV (Excel)", { size: 14, bold: true });
doc.text("- Exportez stocks, mouvements, ventes et approvisionnements", { indent: 10 });
doc.text("  depuis le tableau de bord ou chaque page.", { indent: 10 });
doc.text("- L'export des ventes accepte une periode (ce mois, mois precedent", { indent: 10 });
doc.text("  ou plage personnalisee). Fichiers compatibles Excel.", { indent: 10 });
doc.spacer(6);

doc.text("6. Utilisateurs et roles (admin)", { size: 14, bold: true });
doc.text("- Administrateur : gestion complete + utilisateurs + parametres.", { indent: 10 });
doc.text("- Employe : operations quotidiennes uniquement.", { indent: 10 });
doc.text("- Invitez vos equipes depuis la page Utilisateurs.", { indent: 10 });
doc.spacer(6);

doc.text("7. Assistance", { size: 14, bold: true });
doc.text("- Besoin d'aide : bouton WhatsApp dans la barre laterale.", { indent: 10 });
doc.text("- Support StockFlow - reponse rapide du lundi au samedi.", { indent: 10 });

doc.pageBreak();
doc.text("Astuces", { size: 14, bold: true });
doc.text("- Sur mobile, ouvrez le menu avec le bouton en haut a droite.", { indent: 10 });
doc.text("- Les alertes de stock bas apparaissent des que la quantite", { indent: 10 });
doc.text("  atteint le seuil defini sur le produit.", { indent: 10 });
doc.text("- Changez la devise (EUR, XOF, MAD...) dans Parametres.", { indent: 10 });
doc.spacer(10);
doc.line();
doc.text("Merci d'utiliser StockFlow !", { size: 12, bold: true });
doc.text("Support WhatsApp : +225 07 48 32 31 91", { indent: 10, color: "0.1 0.4 0.2" });

writeFileSync(OUT, doc.build());
console.log("PDF généré :", OUT);
