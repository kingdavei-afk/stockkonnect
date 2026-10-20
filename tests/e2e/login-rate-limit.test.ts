import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { after, before, describe, test } from "node:test";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { rateLimitKey } from "../../src/lib/auth-rate-limit-core";

/**
 * Suite HTTP réelle : elle démarre le build de production (`next start`) et
 * vérifie le comportement des routes, pas seulement celui du limiteur.
 *
 * Elle écrit dans la base configurée par DATABASE_URL (entreprise et comptes
 * jetables, supprimés à la fin). Lancement : `npm run test:e2e` (qui rebuild).
 */

const PASSWORD = "e2e-Stock-2026";
const run = randomUUID().replace(/-/g, "").slice(0, 10);
const EMAIL = `e2e-login-${run}@example.test`;
const SECOND_EMAIL = `e2e-login2-${run}@example.test`;
// Le numéro doit rester numérique : `run` est hexadécimal.
const phoneSuffix = String(100_000_000 + Math.floor(Math.random() * 899_999_999));
const WHATSAPP = `+225 ${phoneSuffix.slice(0, 2)} ${phoneSuffix.slice(2, 4)} ${phoneSuffix.slice(4, 6)} ${phoneSuffix.slice(6, 9)}`;
const WHATSAPP_VARIANTS = [
  WHATSAPP,
  WHATSAPP.replace("+225 ", "+225"),
  WHATSAPP.replace("+225 ", "00225 "),
  WHATSAPP.replace("+225 ", "").replace(/ /g, ""),
];

/** IP de documentation RFC 5737 : jamais routées, uniques par scénario. */
const IPS = {
  loginEmail: "203.0.113.11",
  loginWhatsapp: "203.0.113.12",
  resetOnSuccess: "203.0.113.13",
  register: "203.0.113.14",
  registerOtherIp: "203.0.113.15",
  registerBlockedBeforeValidation: "203.0.113.16",
};

const prisma = new PrismaClient();
let server: ChildProcess | null = null;
let baseUrl = "";
let serverLog = "";

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

async function waitForServer(url: string, deadlineMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < deadlineMs) {
    try {
      const res = await fetch(`${url}/login`, { redirect: "manual" });
      if (res.status === 200) return;
    } catch {
      // serveur pas encore à l'écoute
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Serveur injoignable sur ${url}\n--- logs ---\n${serverLog.slice(-4000)}`);
}

async function startServer(): Promise<string> {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)],
    { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] }
  );
  server.stdout?.on("data", (chunk) => {
    serverLog += chunk.toString();
  });
  server.stderr?.on("data", (chunk) => {
    serverLog += chunk.toString();
  });
  await waitForServer(url, 90_000);
  return url;
}

type LoginResult = {
  status: number;
  body: { error?: string; ok?: boolean; role?: string } | null;
  retryAfter: string | null;
  setCookie: string[];
};

async function login(
  identifier: string,
  password: string,
  ip: string
): Promise<LoginResult> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ identifier, password }),
  });
  return {
    status: res.status,
    body: await res.json().catch(() => null),
    retryAfter: res.headers.get("retry-after"),
    setCookie: res.headers.getSetCookie(),
  };
}

async function register(email: string, ip: string, password = PASSWORD) {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({
      name: "Test E2E",
      email,
      password,
      organizationName: `E2E ${run}`,
      whatsappNumber: WHATSAPP,
    }),
  });
  return {
    status: res.status,
    body: (await res.json().catch(() => null)) as { error?: string } | null,
    retryAfter: res.headers.get("retry-after"),
  };
}

function assertBlocked(result: LoginResult | { status: number; retryAfter: string | null }, context: string) {
  assert.equal(result.status, 429, `${context} : statut attendu 429`);
  const retryAfter = Number(result.retryAfter);
  assert.ok(Number.isInteger(retryAfter) && retryAfter > 0, `${context} : Retry-After numérique`);
  assert.ok(retryAfter <= 60 * 60, `${context} : Retry-After borné à la fenêtre`);
}

describe("limitation des tentatives d'authentification (HTTP)", () => {
  before(async () => {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    await prisma.organization.create({
      data: {
        name: `E2E ${run}`,
        slug: `e2e-${run}`,
        phone: WHATSAPP,
        plan: "GRATUIT",
        maxUsers: 2,
        settings: { create: {} },
        users: {
          create: [
            { email: EMAIL, name: "E2E Admin", passwordHash, role: "ADMIN" },
            { email: SECOND_EMAIL, name: "E2E Staff", passwordHash, role: "STAFF" },
          ],
        },
      },
    });
    baseUrl = await startServer();
  }, { timeout: 180_000 });

  after(async () => {
    // Nettoyage : compteurs créés par la suite, puis l'entreprise jetable.
    const loginIdentifiers = [...new Set([EMAIL, SECOND_EMAIL, ...WHATSAPP_VARIANTS])];
    const keys = [
      ...loginIdentifiers.map((identifier) => rateLimitKey("login", "id", identifier)),
      ...Object.values(IPS).map((ip) => rateLimitKey("login", "ip", ip)),
      ...Object.values(IPS).map((ip) => rateLimitKey("register", "ip", ip)),
      ...[EMAIL, SECOND_EMAIL].map((email) => rateLimitKey("register", "id", email)),
    ];
    await prisma.authRateLimitEvent.deleteMany({ where: { key: { in: keys } } });
    await prisma.organization.deleteMany({ where: { slug: `e2e-${run}` } });

    if (server && !server.killed) {
      server.kill();
      await new Promise((resolve) => server?.once("exit", resolve));
    }
    await prisma.$disconnect();
  });

  test("une connexion normale fonctionne", async () => {
    const result = await login(EMAIL, PASSWORD, IPS.loginEmail);
    assert.equal(result.status, 200);
    assert.equal(result.body?.ok, true);
    assert.equal(result.body?.role, "ADMIN");
    assert.ok(result.setCookie.some((cookie) => cookie.includes("=")));
  });

  test("5 mauvais mots de passe bloquent même le bon", async () => {
    for (let i = 0; i < 5; i++) {
      const attempt = await login(EMAIL, `mauvais-${i}`, IPS.loginEmail);
      assert.equal(attempt.status, 401, `essai ${i + 1} doit échouer en 401`);
    }

    const blocked = await login(EMAIL, PASSWORD, IPS.loginEmail);
    assertBlocked(blocked, "bon mot de passe après 5 échecs");
    assert.match(blocked.body?.error ?? "", /Trop de tentatives de connexion/);
    assert.equal(blocked.setCookie.length, 0, "aucune session ne doit être créée");
  });

  test("les variantes d'un même numéro WhatsApp partagent le compteur", async () => {
    for (let i = 0; i < 5; i++) {
      const attempt = await login(WHATSAPP_VARIANTS[i % WHATSAPP_VARIANTS.length], `mauvais-${i}`, IPS.loginWhatsapp);
      assert.equal(attempt.status, 401);
    }

    for (const variant of WHATSAPP_VARIANTS) {
      const blocked = await login(variant, PASSWORD, IPS.loginWhatsapp);
      assertBlocked(blocked, `variante « ${variant} »`);
    }
  });

  test("une réussite remet le compteur à zéro, puis 5 nouveaux échecs bloquent", async () => {
    const identifier = SECOND_EMAIL;

    for (let i = 0; i < 3; i++) {
      assert.equal((await login(identifier, `mauvais-${i}`, IPS.resetOnSuccess)).status, 401);
    }

    const success = await login(identifier, PASSWORD, IPS.resetOnSuccess);
    assert.equal(success.status, 200);
    assert.equal(success.body?.ok, true);

    // Le compteur doit être revenu à zéro : quatre échecs repassent en 401.
    for (let i = 0; i < 4; i++) {
      assert.equal((await login(identifier, `encore-${i}`, IPS.resetOnSuccess)).status, 401);
    }
    assert.equal((await login(identifier, "cinquieme", IPS.resetOnSuccess)).status, 401);

    const blocked = await login(identifier, PASSWORD, IPS.resetOnSuccess);
    assertBlocked(blocked, "après une réussite puis 5 échecs");
  });

  test("l'inscription bloque après 5 demandes sur le même email", async () => {
    for (let i = 0; i < 5; i++) {
      const attempt = await register(EMAIL, IPS.register);
      assert.equal(attempt.status, 409, "email déjà utilisé");
      assert.equal(attempt.retryAfter, null);
    }

    const blocked = await register(EMAIL, IPS.register);
    assertBlocked(blocked, "6e inscription");
    assert.match(blocked.body?.error ?? "", /Trop de tentatives d'inscription/);
  });

  test("la limite d'inscription est contrôlée avant validation et ne dépend pas du compte", async () => {
    const blocked = await register(EMAIL, IPS.registerBlockedBeforeValidation, "x");
    assertBlocked(blocked, "payload invalide sur un email bloqué");
  });

  test("une autre adresse IP n'est pas bloquée par la limite d'inscription", async () => {
    const result = await register(SECOND_EMAIL, IPS.registerOtherIp);
    assert.equal(result.status, 409);
    assert.equal(result.retryAfter, null);
  });
});
