import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const prisma = new PrismaClient();
test.afterAll(async () => prisma.$disconnect());

test("landing → inscription → essai → offre → handoff paiement sûr", async ({ page, context }) => {
  const suffix = randomUUID().slice(0, 8);
  const organizationName = `QA E2E ${suffix}`;
  const email = `qa-e2e-${suffix}@example.test`;

  await test.step("La landing mène au formulaire d’inscription", async () => {
    await page.goto("/");
    const startTrial = page.getByRole("link", { name: /Démarrer mon essai gratuit/i }).first();
    await expect(startTrial).toBeVisible();
    await startTrial.click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole("heading", { name: "Créer un compte" })).toBeVisible();
  });

  await test.step("Créer le compte et vérifier la session/essai", async () => {
    await page.getByLabel("Nom de l'entreprise").fill(organizationName);
    await page.getByLabel("Numéro WhatsApp").fill("+225 07 48 32 31 91");
    await page.getByLabel("Votre nom").fill("Client QA");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mot de passe").fill("Stock-E2E-Local-987!");

    const signupResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/auth/register") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    const signupResponse = await signupResponsePromise;
    expect(signupResponse.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard$/);

    const session = (await context.cookies()).find((cookie) => cookie.name === "sf_session");
    expect(session).toBeTruthy();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        organizationId: true,
        organization: { select: { name: true, plan: true, maxProducts: true, maxUsers: true, trialEndsAt: true } },
      },
    });
    expect(user?.organizationId).toBeTruthy();
    expect(user?.organization?.name).toBe(organizationName);
    expect(user?.organization?.plan).toBe("GRATUIT");
    expect(user?.organization?.maxProducts).toBe(10);
    expect(user?.organization?.maxUsers).toBe(2);
    expect(user?.organization?.trialEndsAt).toBeInstanceOf(Date);

    const productAccess = await page.request.get("/api/products");
    expect(productAccess.status()).toBe(200);
  });

  await test.step("Afficher les offres et sélectionner le cycle annuel", async () => {
    await page.goto("/plans");
    await expect(page.getByRole("heading", { name: "Options d'abonnement" })).toBeVisible();
    const proCard = page.getByRole("heading", { name: "Pro", exact: true }).locator("..");
    await expect(proCard).toBeVisible();
    await expect(proCard).toContainText("14");
    await expect(proCard).toContainText("/mois");

    const cycleSwitch = page.getByRole("switch");
    await expect(cycleSwitch).toHaveAttribute("aria-checked", "false");
    await cycleSwitch.click();
    await expect(cycleSwitch).toHaveAttribute("aria-checked", "true");
    await expect(proCard).toContainText("/an");
  });

  await test.step("Le CTA de l’offre ouvre le handoff WhatsApp sans envoyer de message", async () => {
    const proCard = page.getByRole("heading", { name: "Pro", exact: true }).locator("..");
    const popupPromise = page.waitForEvent("popup");
    await proCard.getByRole("button", { name: /Choisir cette offre/i }).click();
    const popup = await popupPromise;
    await expect.poll(() => popup.url()).toContain("whatsapp.com/send");

    const whatsappUrl = new URL(popup.url());
    expect(whatsappUrl.searchParams.get("phone")).toBe("2250748323191");
    const message = whatsappUrl.searchParams.get("text") ?? "";
    expect(message).toContain("Pro");
    expect(message).toContain("annuelle");
    expect(message).toContain(organizationName);
    await popup.close();
  });

  await test.step("Le checkout payant s’arrête proprement avant tout paiement", async () => {
    expect(process.env.CINETPAY_API_KEY ?? "").toBe("");
    expect(process.env.CINETPAY_API_PASSWORD ?? "").toBe("");

    const user = await prisma.user.findUnique({ where: { email }, select: { organizationId: true } });
    expect(user?.organizationId).toBeTruthy();
    const before = await prisma.payment.count({ where: { organizationId: user!.organizationId! } });
    expect(before).toBe(0);

    const checkout = await page.request.post("/api/subscription/checkout", {
      data: { planId: "PRO", cycle: "yearly" },
    });
    expect(checkout.status()).toBe(409);
    const body = await checkout.json();
    expect(body.error).toContain("gérés manuellement");

    const after = await prisma.payment.count({ where: { organizationId: user!.organizationId! } });
    expect(after).toBe(0);
  });
});
