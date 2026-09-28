/**
 * Générateur PDF minimal (PDF 1.4, Helvetica/WinAnsi) — même approche que
 * scripts/generate-guide.mjs, mais avec support multi-pages et pagination.
 * Sert aux factures d'abonnement générées à la volée.
 */

const latin1 = (s: string) =>
  [...s].map((ch) => ((ch.codePointAt(0) ?? 0) <= 255 ? ch : "?")).join("");

const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export class InvoicePdf {
  private pages: string[][] = [];
  private current: string[] = [];
  private y = 780;

  /** Ligne de texte ; passe à la page suivante automatiquement si nécessaire. */
  text(
    str: string,
    opts: { size?: number; bold?: boolean; indent?: number; gap?: number; color?: string } = {}
  ) {
    const { size = 11, bold = false, indent = 0, gap = 8, color = "0 0 0" } = opts;
    if (this.y < 60) this.pageBreak();
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
    if (this.y < 60) this.pageBreak();
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

  build(): Buffer {
    this.pages.push(this.current);
    const objects: string[] = [];
    const pageIds: number[] = [];
    const contentIds: { id: number; ops: string[] }[] = [];
    // 1 = catalog, 2 = pages, 3 = font regular, 4 = font bold, puis page + contenu
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
      objects[id] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
    }
    pageIds.forEach((pageId, i) => {
      const contentId = pageId + 1;
      objects[pageId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    });

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
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
