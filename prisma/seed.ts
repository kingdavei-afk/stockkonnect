import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { loadEnvConfig } from "@next/env";

// Charge notamment .env.production.local après un `vercel env pull`.
loadEnvConfig(process.cwd());

const db = new PrismaClient();

async function seedSuperAdmin() {
  const email = process.env.SUPERADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_BOOTSTRAP_PASSWORD;
  const resetExisting = process.env.SUPERADMIN_BOOTSTRAP_RESET === "true";

  if (!email && !password) {
    const existing = await db.user.count({ where: { role: "SUPER_ADMIN" } });
    if (!existing && process.env.NODE_ENV === "production") {
      throw new Error(
        "Aucun super-admin n'existe. Définissez SUPERADMIN_BOOTSTRAP_EMAIL et SUPERADMIN_BOOTSTRAP_PASSWORD pour le premier provisionnement."
      );
    }
    if (existing) console.log("Super-admin existant conservé (aucun identifiant affiché).");
    else console.log("Provisionnement du super-admin ignoré en développement.");
    return;
  }

  if (!email || !password) {
    throw new Error("Les variables SUPERADMIN_BOOTSTRAP_EMAIL et SUPERADMIN_BOOTSTRAP_PASSWORD doivent être définies ensemble.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("SUPERADMIN_BOOTSTRAP_EMAIL doit être une adresse valide.");
  }
  if (password.length < 16) {
    throw new Error("SUPERADMIN_BOOTSTRAP_PASSWORD doit contenir au moins 16 caractères.");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing && existing.role !== "SUPER_ADMIN") {
    throw new Error("L'adresse de provisionnement existe déjà sans le rôle SUPER_ADMIN.");
  }

  if (existing && !resetExisting) {
    console.log("Super-admin de provisionnement déjà présent ; compte conservé sans modification.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { passwordHash } });
    console.log("Mot de passe du super-admin réinitialisé depuis la variable de provisionnement.");
    return;
  }

  await db.user.create({
    data: {
      email,
      name: "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      organizationId: null,
    },
  });
  console.log("Compte super-admin de provisionnement créé (mot de passe non affiché).");
}

async function main() {
  await seedSuperAdmin();
  if (process.env.SUPERADMIN_ONLY === "true") {
    console.log("Mode super-admin uniquement terminé.");
    return;
  }

  const email = "demo@stockkonect.fr";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.organizationId) {
      await db.organization.update({
        where: { id: existing.organizationId },
        data: {
          plan: "GRATUIT",
          billingCycle: null,
          planEndsAt: null,
          trialEndsAt: null,
          maxUsers: 2,
          maxProducts: 10,
        },
      });
    }
    console.log("Seed déjà appliqué (demo@stockkonect.fr existe).");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const org = await db.organization.create({
    data: {
      name: "Demo SAS",
      slug: "demo-sas",
      plan: "GRATUIT",
      maxUsers: 2,
      maxProducts: 10,
      planEndsAt: null,
      trialEndsAt: null,
      settings: { create: { currency: "EUR", lowStockThreshold: 5 } },
      users: {
        create: { email, name: "Utilisateur Démo", passwordHash, role: "ADMIN" },
      },
      categories: {
        create: [
          { name: "Électronique" },
          { name: "Bureautique" },
          { name: "Accessoires" },
        ],
      },
      suppliers: {
        create: [
          { name: "TechImport", email: "contact@techimport.fr", phone: "01 23 45 67 89" },
          { name: "GlobalFournisseur", email: "ventes@globalf.fr", phone: "04 56 78 90 12" },
        ],
      },
      customers: {
        create: [
          { name: "Boutique Martin", email: "martin@boutique.fr", phone: "06 12 34 56 78" },
          { name: "Société Durand", email: "contact@durand.fr", phone: "07 98 76 54 32" },
        ],
      },
    },
  });

  const [electronics, office] = await db.category.findMany({
    where: { organizationId: org.id },
  });
  const [techImport] = await db.supplier.findMany({
    where: { organizationId: org.id },
  });

  const products = [
    { name: "Clavier mécanique", sku: "ELC-001", barcode: "3011111111111", price: 89.9, cost: 45, quantity: 32, minStock: 8, categoryId: electronics.id, supplierId: techImport.id },
    { name: "Souris sans fil", sku: "ELC-002", barcode: "3011111111128", price: 29.9, cost: 12, quantity: 3, minStock: 10, categoryId: electronics.id, supplierId: techImport.id },
    { name: "Écran 24 pouces", sku: "ELC-003", barcode: "3011111111135", price: 179.0, cost: 110, quantity: 12, minStock: 5, categoryId: electronics.id, supplierId: techImport.id },
    { name: "Cahier A4 (lot de 5)", sku: "BUR-001", barcode: "3022222222221", price: 12.5, cost: 5, quantity: 60, minStock: 20, categoryId: office.id },
    { name: "Stylo bille (boîte de 50)", sku: "BUR-002", barcode: "3022222222238", price: 9.9, cost: 3.5, quantity: 2, minStock: 10, categoryId: office.id },
  ];

  for (const p of products) {
    await db.product.create({
      data: { ...p, organizationId: org.id },
    });
  }

  console.log("Base de démonstration créée.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
