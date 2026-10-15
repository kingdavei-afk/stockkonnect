// Safe local E2E runner. It only migrates a local database whose name contains
// "test", launches no payment credentials, and runs the browser suite on localhost.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATABASE_URL = process.env.DATABASE_URL;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
if (!DATABASE_URL) throw new Error("DATABASE_URL locale manquante.");
const database = new URL(DATABASE_URL);
if (!LOCAL_HOSTS.has(database.hostname) || !database.pathname.toLowerCase().includes("test")) {
  throw new Error("Refus de lancer l’E2E : DATABASE_URL doit viser localhost et une base dont le nom contient 'test'.");
}

const env = {
  ...process.env,
  DATABASE_URL,
  AUTH_SECRET: randomBytes(32).toString("hex"),
  // Définit des valeurs vides pour éviter qu’un .env local ne puisse activer CinetPay.
  CINETPAY_API_KEY: "",
  CINETPAY_API_PASSWORD: "",
  CINETPAY_API_BASE: "",
};

function run(label, args) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(process.execPath, args, { cwd: ROOT, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const prismaCli = resolve(ROOT, "node_modules/prisma/build/index.js");
const playwrightCli = resolve(ROOT, "node_modules/@playwright/test/cli.js");
run("Migrations Prisma — base locale *_test seulement", [prismaCli, "migrate", "deploy"]);
run("Playwright E2E — Chromium local, paiements réels désactivés", [
  playwrightCli,
  "test",
  "e2e/conversion.spec.ts",
  "--config=playwright.config.ts",
]);
