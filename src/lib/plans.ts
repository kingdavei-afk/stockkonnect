export type PlanId = "GRATUIT" | "PRO" | "BUSINESS";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number; // F CFA / mois
  yearly: number; // F CFA / an (2 mois offerts)
  maxUsers: number;
  maxProducts: number | null; // null = illimité
  trialDays?: number; // durée d'essai offerte
  modules: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "GRATUIT",
    name: "Gratuit",
    tagline: "Pour tester pendant 7 jours",
    monthly: 0,
    yearly: 0,
    maxUsers: 2,
    maxProducts: 10,
    trialDays: 7,
    modules: [
      "Essai de 7 jours",
      "Jusqu'à 10 produits",
      "Ventes & approvisionnements",
      "Tableau de bord",
      "2 utilisateurs",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    tagline: "Pour les commerces en croissance",
    monthly: 9900,
    yearly: 99000, // 2 mois offerts
    maxUsers: 3,
    maxProducts: 500,
    highlight: true,
    modules: [
      "Nombre de produits étendu (500)",
      "Jusqu'à 3 utilisateurs",
      "Exports CSV illimités",
      "Codes-barres & étiquettes",
      "Support WhatsApp prioritaire",
    ],
  },
  {
    id: "BUSINESS",
    name: "Business",
    tagline: "Pour les entreprises établies",
    monthly: 24900,
    yearly: 249000,
    maxUsers: 10,
    maxProducts: null,
    modules: [
      "Produits illimités",
      "Jusqu'à 10 utilisateurs",
      "Support 24h/24",
      "Exports CSV illimités",
      "Accompagnement dédié",
    ],
  },
];

export function getPlan(id: string): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
