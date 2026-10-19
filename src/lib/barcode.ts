/**
 * Génération automatique de code-barres EAN-13.
 * Préfixe GS1 « 20 » réservé aux usages en magasin (auto-gestion),
 * 11 chiffres aléatoires puis chiffre de contrôle officiel EAN-13.
 */

function ean13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

export function generateEan13(): string {
  let body = "20"; // 2 chiffres de préfixe
  for (let i = 0; i < 10; i++) body += Math.floor(Math.random() * 10); // 12 chiffres au total
  return body + ean13CheckDigit(body); // 13e chiffre = contrôle
}
