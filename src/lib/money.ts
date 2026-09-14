/**
 * Formate un montant dans la devise de l'organisation.
 * Les devises sans décimales (XOF, XAF, JPY, KRW…) sont arrondies à l'entier,
 * les autres gardent 2 décimales.
 */
const ZERO_DECIMAL = new Set(["XOF", "XAF", "JPY", "KRW", "VND", "CLP", "ISK", "UGX", "RWF", "GNF"]);

export function formatMoney(n: number, currency: string): string {
  const digits = ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}
