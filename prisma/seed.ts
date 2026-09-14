import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // Compte plateforme (super-admin), sans entreprise — créé en premier, indépendamment de la démo
  if (!(await db.user.findUnique({ where: { email: "admin@stockflow.fr" } }))) {
    await db.user.create({
      data: {
        email: "admin@stockflow.fr",
        name: "Super Admin",
        passwordHash: await bcrypt.hash("super1234", 10),
        role: "SUPER_ADMIN",
        organizationId: null,
      },
    });
    console.log("Super-admin créé : admin@stockflow.fr / super1234");
  }

  const email = "demo@stockflow.fr";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed déjà appliqué (demo@stockflow.fr existe).");
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const org = await db.organization.create({
    data: {
      name: "Demo SAS",
      slug: "demo-sas",
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
  console.log("Connexion : demo@stockflow.fr / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
