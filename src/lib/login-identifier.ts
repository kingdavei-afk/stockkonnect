/**
 * Normalisation de l'identifiant de connexion (email ou numéro WhatsApp).
 * Partagé entre la recherche du compte et la limitation des tentatives, pour
 * qu'une même saisie retombe toujours sur la même clé.
 */

export function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Réduit un numéro WhatsApp à ses chiffres (le préfixe international 00 est
 * retiré). Renvoie null si la saisie ne peut pas être un numéro.
 */
export function whatsappDigits(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/**
 * Compare deux numéros WhatsApp. Les numéros sont saisis librement (`+225…`,
 * `00225…`, `07 00 00 00 00`…), on compare donc les 9 derniers chiffres
 * significatifs quand les écritures complètes diffèrent.
 */
export function isSameWhatsapp(a: string, b: string): boolean {
  const digitsA = whatsappDigits(a);
  const digitsB = whatsappDigits(b);
  if (!digitsA || !digitsB) return false;
  if (digitsA === digitsB) return true;
  const size = 9;
  return (
    digitsA.length >= size &&
    digitsB.length >= size &&
    digitsA.slice(-size) === digitsB.slice(-size)
  );
}

/**
 * Forme canonique d'un identifiant, utilisée comme clé de limitation : les
 * emails sont comparés sans casse, les numéros sur leurs 9 derniers chiffres
 * (même règle que la recherche du compte), afin qu'aucune écriture alternative
 * — `+225…`, `00225…`, `07 99 88 77 66` — ne contourne le compteur.
 */
export function canonicalIdentifier(identifier: string): string {
  const value = identifier.trim();
  if (isEmailLike(value)) return `email:${value.toLowerCase()}`;
  const digits = whatsappDigits(value);
  if (digits) return `whatsapp:${digits.length >= 9 ? digits.slice(-9) : digits}`;
  return `raw:${value.toLowerCase()}`;
}
