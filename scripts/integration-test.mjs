// Local-only integration test. It refuses remote hosts and requires a disposable
// PostgreSQL database whose name contains "test". It starts its own local Next.js
// server with that exact DATABASE_URL, then kills it even if an assertion fails.
// Usage: DATABASE_URL=postgresql://.../stockkonnect_test npm run test:integration
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATABASE_URL = process.env.DATABASE_URL;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
if (!DATABASE_URL) throw new Error("DATABASE_URL locale manquante.");
const database = new URL(DATABASE_URL);
if (!LOCAL_HOSTS.has(database.hostname) || !database.pathname.toLowerCase().includes("test")) {
  throw new Error("Refus d’écrire : DATABASE_URL doit viser localhost et une base dont le nom contient 'test'.");
}

async function availablePort() {
  const probe = createServer();
  await new Promise((resolveListen, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolveListen);
  });
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("Impossible d’allouer un port local.");
  const port = address.port;
  await new Promise((resolveClose, reject) => probe.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

const port = await availablePort();
const base = `http://127.0.0.1:${port}`;
let app;
let appExitError;
process.on("exit", () => { if (app && app.exitCode === null) app.kill("SIGKILL"); });

function delay(ms) { return new Promise((resolveDelay) => setTimeout(resolveDelay, ms)); }
async function stopApp() {
  if (!app || app.exitCode !== null) return;
  app.kill("SIGTERM");
  await Promise.race([once(app, "exit"), delay(5_000)]);
  if (app.exitCode === null) app.kill("SIGKILL");
}

app = spawn(process.execPath, [
  resolve(ROOT, "node_modules/next/dist/bin/next"),
  "start", "--hostname", "127.0.0.1", "--port", String(port),
], {
  cwd: ROOT,
  env: {
    ...process.env,
    DATABASE_URL,
    AUTH_SECRET: randomBytes(32).toString("hex"),
  },
  stdio: "ignore",
});
app.once("error", (error) => { appExitError = error; });

let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  if (appExitError) throw appExitError;
  if (app.exitCode !== null) throw new Error(`Serveur local terminé prématurément (code ${app.exitCode}, signal ${app.signalCode ?? "aucun"}).`);
  try {
    const response = await fetch(`${base}/`, { signal: AbortSignal.timeout(2_000) });
    if (response.status === 200) { ready = true; break; }
  } catch {}
  await delay(500);
}
if (!ready) throw new Error("Le serveur local n’a pas démarré ; exécutez `npm run build` avant les tests d’intégration.");

let checks = 0;
function ok(label) {
  checks += 1;
  console.log(`OK ${String(checks).padStart(2, "0")} ${label}`);
}
function status(result, expected, label) {
  assert.equal(result.status, expected, `${label}: attendu HTTP ${expected}, reçu ${result.status} (${result.text.slice(0, 180)})`);
  ok(`${label} — HTTP ${expected}`);
}

async function api(path, { method = "GET", cookie, body } = {}) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await fetch(new URL(path, base), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { status: response.status, data, text, cookies: response.headers.getSetCookie?.() ?? [] };
}

function sessionCookie(result, label) {
  const cookie = result.cookies.find((item) => item.startsWith("sf_session="));
  assert.ok(cookie, `${label}: cookie sf_session absent`);
  assert.match(cookie, /HttpOnly/i, `${label}: cookie non HttpOnly`);
  assert.match(cookie, /SameSite=Lax/i, `${label}: SameSite inattendu`);
  ok(`${label} — cookie HttpOnly/SameSite=Lax`);
  return cookie.split(";")[0];
}

async function register(email, organizationName) {
  const result = await api("/api/auth/register", {
    method: "POST",
    body: {
      name: "QA local",
      email,
      password: "Local-QA-Password-987!",
      organizationName,
      whatsappNumber: "+2250748323191",
    },
  });
  status(result, 200, `inscription ${organizationName}`);
  return sessionCookie(result, `inscription ${organizationName}`);
}

async function products(cookie) {
  const result = await api("/api/products", { cookie });
  status(result, 200, "lecture des produits du compte");
  assert.ok(Array.isArray(result.data), "la réponse produits doit être un tableau");
  return result.data;
}

function productPayload(sku, quantity = 10) {
  return { name: `Produit QA ${sku}`, sku, price: 5, cost: 2, quantity, minStock: 2 };
}

try {
  const stamp = `${Date.now()}-${randomBytes(3).toString("hex")}`;

  const invalidSignup = await api("/api/auth/register", {
    method: "POST",
    body: {
      name: "QA",
      email: "not-an-email",
      password: "Local-QA-Password-987!",
      organizationName: "Test",
      whatsappNumber: "+2250748323191",
    },
  });
  status(invalidSignup, 400, "validation des données d’inscription");

  const userA = `qa-a-${stamp}@example.test`;
  const cookieA = await register(userA, `QA Org A ${stamp}`);
  const duplicate = await api("/api/auth/register", {
    method: "POST",
    body: {
      name: "QA local",
      email: userA,
      password: "Local-QA-Password-987!",
      organizationName: `QA duplicate ${stamp}`,
      whatsappNumber: "+2250748323191",
    },
  });
  status(duplicate, 409, "refus d’une adresse email déjà utilisée");

  const userB = `qa-b-${stamp}@example.test`;
  const cookieB = await register(userB, `QA Org B ${stamp}`);
  const noAuth = await api("/api/products");
  status(noAuth, 401, "API produits sans session");

  const createdProduct = await api("/api/products", {
    method: "POST",
    cookie: cookieA,
    body: productPayload(`QA-${stamp}`),
  });
  status(createdProduct, 201, "création d’un produit avec stock initial");
  const productId = createdProduct.data?.id;
  assert.ok(productId, "identifiant produit manquant");
  assert.equal(createdProduct.data.quantity, 10);
  ok("stock initial correctement enregistré");

  const duplicateSku = await api("/api/products", {
    method: "POST",
    cookie: cookieA,
    body: productPayload(`QA-${stamp}`),
  });
  status(duplicateSku, 409, "unicité du SKU dans une organisation");

  const tenantBProducts = await products(cookieB);
  assert.equal(tenantBProducts.length, 0, "l’organisation B ne doit voir aucun produit de A");
  ok("cloisonnement multi-entreprise à la lecture");

  const crossTenantUpdate = await api(`/api/products/${productId}`, {
    method: "PATCH",
    cookie: cookieB,
    body: { ...productPayload(`QA-FOREIGN-${stamp}`, 0), name: "Tentative inter-tenant" },
  });
  status(crossTenantUpdate, 404, "modification d’un produit appartenant à une autre organisation");

  const sale = await api("/api/sales", {
    method: "POST",
    cookie: cookieA,
    body: { items: [{ productId, quantity: 2 }] },
  });
  status(sale, 201, "vente et décrément atomique du stock");
  assert.equal((await products(cookieA)).find((item) => item.id === productId)?.quantity, 8);
  ok("stock décrémenté de 2 après vente");

  const oversell = await api("/api/sales", {
    method: "POST",
    cookie: cookieA,
    body: { items: [{ productId, quantity: 999 }] },
  });
  status(oversell, 400, "refus d’une vente supérieure au stock");
  assert.equal((await products(cookieA)).find((item) => item.id === productId)?.quantity, 8);
  ok("échec de vente sans mutation du stock");

  const saleId = sale.data?.id;
  assert.ok(saleId, "identifiant vente manquant");
  const cancelSale = await api(`/api/sales/${saleId}`, { method: "PATCH", cookie: cookieA, body: { status: "CANCELLED" } });
  status(cancelSale, 200, "annulation d’une vente");
  assert.equal((await products(cookieA)).find((item) => item.id === productId)?.quantity, 10);
  ok("stock restauré après annulation de vente");
  const repeatCancelSale = await api(`/api/sales/${saleId}`, { method: "PATCH", cookie: cookieA, body: { status: "CANCELLED" } });
  status(repeatCancelSale, 200, "annulation idempotente d’une vente");
  assert.equal(repeatCancelSale.data?.alreadyCancelled, true);

  const purchase = await api("/api/purchases", {
    method: "POST",
    cookie: cookieA,
    body: { items: [{ productId, quantity: 3, unitCost: 1.5 }] },
  });
  status(purchase, 201, "approvisionnement et incrément du stock");
  assert.equal((await products(cookieA)).find((item) => item.id === productId)?.quantity, 13);
  ok("stock augmenté de 3 après approvisionnement");

  const purchaseId = purchase.data?.id;
  assert.ok(purchaseId, "identifiant approvisionnement manquant");
  const cancelPurchase = await api(`/api/purchases/${purchaseId}`, { method: "PATCH", cookie: cookieA, body: { status: "CANCELLED" } });
  status(cancelPurchase, 200, "annulation d’un approvisionnement");
  assert.equal((await products(cookieA)).find((item) => item.id === productId)?.quantity, 10);
  ok("stock repris après annulation d’approvisionnement");

  const badMovement = await api("/api/movements", {
    method: "POST",
    cookie: cookieA,
    body: { productId, type: "OUT", quantity: 999 },
  });
  status(badMovement, 400, "refus d’une sortie supérieure au stock");
  assert.equal((await products(cookieA)).find((item) => item.id === productId)?.quantity, 10);
  ok("échec de sortie sans mutation du stock");

  for (let i = 2; i <= 10; i++) {
    const extra = await api("/api/products", {
      method: "POST",
      cookie: cookieA,
      body: productPayload(`QA-${stamp}-${i}`, 0),
    });
    status(extra, 201, `produit ${i} sous la limite gratuite`);
  }
  const overPlan = await api("/api/products", {
    method: "POST",
    cookie: cookieA,
    body: productPayload(`QA-${stamp}-11`, 0),
  });
  status(overPlan, 402, "limite de 10 produits du forfait gratuit");

  const demoLogin = await api("/api/auth/login", {
    method: "POST",
    body: { email: "demo@stockkonect.fr", password: "demo1234" },
  });
  status(demoLogin, 200, "connexion du compte démo local");
  const demoCookie = sessionCookie(demoLogin, "connexion du compte démo local");
  const demoBefore = await products(demoCookie);
  const blockedWrite = await api("/api/products", {
    method: "POST",
    cookie: demoCookie,
    body: productPayload(`QA-DEMO-${stamp}`, 0),
  });
  status(blockedWrite, 403, "écriture refusée sur le compte démo");
  assert.equal((await products(demoCookie)).length, demoBefore.length);
  ok("écriture démo refusée sans modification des données");

  console.log(`\n${checks} assertions d’intégration réussies. Données créées uniquement dans ${database.pathname.slice(1)}.`);
} finally {
  await stopApp();
}
