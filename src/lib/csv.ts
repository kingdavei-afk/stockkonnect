import { NextResponse } from "next/server";

/**
 * Échappe une valeur pour un CSV compatible Excel :
 * guillemets si séparateur/guillemet/retour ligne, guillemets doublés.
 */
function escapeCsv(value: unknown): string {
  const s =
    value === null || value === undefined
      ? ""
      : value instanceof Date
        ? value.toISOString()
        : String(value);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(escapeCsv).join(";"));
  return lines.join("\r\n");
}

/** Réponse CSV téléchargeable, avec BOM UTF-8 pour Excel. */
export function csvResponse(filename: string, csv: string) {
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
