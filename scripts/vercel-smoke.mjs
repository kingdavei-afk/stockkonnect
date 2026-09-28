// Test de connexion en direct contre le déploiement Vercel.
// Usage : node scripts/vercel-smoke.mjs [baseUrl] [email] [password]
const BASE = process.argv[2] ?? "https://stockkonnect.vercel.app";
const EMAIL = process.argv[3] ?? "demo@stockkonect.fr";
const PASSWORD = process.argv[4] ?? "demo1234";

const results = [];
const log = (name, ok, detail = "") =>
  results.push(`${ok ? "OK " : "ECHEC "} ${name}${detail ? " — " + detail : ""}`);

// 1. Landing accessible
const home = await fetch(BASE + "/", { redirect: "manual" });
log("Landing /", home.status === 200, `HTTP ${home.status}`);

// 2. Marqueur de version : le guide n'existe à ce chemin que dans les derniers déploiements
const guide = await fetch(BASE + "/guide-stockkonect.pdf", { redirect: "manual" });
log("Guide PDF (version du déploiement)", guide.status === 200, `HTTP ${guide.status}`);

// 3. API de connexion
const login = await fetch(BASE + "/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const setCookies = login.headers.getSetCookie?.() ?? [];
const hasSession = setCookies.some((c) => c.toLowerCase().includes("session"));
const body = await login.text().catch(() => "");
log(
  "POST /api/auth/login",
  login.status === 200 && hasSession,
  `HTTP ${login.status}${body ? " — " + body.slice(0, 120) : ""}${hasSession ? " — cookie session ✓" : " — cookie ABSENT"}`
);

// 4. Page protégée avec le cookie de session
if (login.status === 200 && hasSession) {
  const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
  const dash = await fetch(BASE + "/dashboard", {
    redirect: "manual",
    headers: { cookie },
  });
  log("GET /dashboard (avec session)", dash.status === 200, `HTTP ${dash.status}`);
}

console.log(`Cible : ${BASE}`);
console.log(`Compte : ${EMAIL}`);
console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("ECHEC")) ? 1 : 0);
