export type PlanId = "GRATUIT" | "STARTER" | "PRO" | "BUSINESS";

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
    id: "STARTER",
    name: "Starter",
    tagline: "Les essentiels pour bien démarrer",
    monthly: 9900,
    yearly: 99000, // 2 mois offerts
    maxUsers: 2,
    maxProducts: 50,
    modules: [
      "Jusqu'à 50 produits",
      "Jusqu'à 2 utilisateurs",
      "Exports CSV",
      "Codes-barres & étiquettes",
      "Support WhatsApp",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    tagline: "Pour les commerces en croissance",
    monthly: 14900,
    yearly: 149000, // 2 mois offerts
    maxUsers: 5,
    maxProducts: 200,
    highlight: true,
    modules: [
      "Nombre de produits étendu (200)",
      "Jusqu'à 5 utilisateurs",
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
    maxProducts: 500,
    modules: [
      "Nombre de produits étendu (500)",
      "Jusqu'à 10 utilisateurs",
      "Exports CSV illimités",
      "Accompagnement dédié",
      "Support WhatsApp prioritaire",
    ],
  },
];

export const PUBLIC_PLANS = PLANS.filter((plan) => plan.id !== "GRATUIT");

export function getPlan(id: string): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
