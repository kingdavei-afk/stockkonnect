// Read-only public smoke test. Safe to point at production: it never logs in,
// creates accounts, changes inventory, starts checkout, or submits payments.
// Usage: BASE=https://stockkonnect.vercel.app npm run test:smoke
const baseValue = process.env.BASE ?? "http://127.0.0.1:3000";
const BASE = new URL(baseValue).origin;
const results = [];

async function check(name, path, { method = "GET", status, type, location } = {}) {
  try {
    const response = await fetch(`${BASE}${path}`, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const actualType = response.headers.get("content-type") ?? "";
    const actualLocation = response.headers.get("location") ?? "";
    const ok = response.status === status &&
      (!type || actualType.includes(type)) &&
      (!location || new URL(actualLocation, BASE).pathname === location);
    results.push({ name, ok, detail: `HTTP ${response.status}${actualType ? ` · ${actualType.split(";")[0]}` : ""}${actualLocation ? ` · ${actualLocation}` : ""}` });
    await response.body?.cancel();
  } catch (error) {
    results.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
  }
}

await check("Landing publique", "/", { status: 200, type: "text/html" });
await check("Connexion publique", "/login", { status: 200, type: "text/html" });
await check("Inscription publique", "/register", { status: 200, type: "text/html" });
await check("Tarifs consultables sans compte", "/plans", { status: 200, type: "text/html" });
await check("Guide PDF public", "/guide-stockkonect.pdf", { status: 200, type: "application/pdf" });
await check("Affiche vidéo publique", "/video-stockkonect-poster.jpg", { method: "HEAD", status: 200, type: "image/jpeg" });
await check("Vidéo MP4 publique", "/video-publicitaire-stockkonect.mp4", { method: "HEAD", status: 200, type: "video/mp4" });
await check("Vidéo WebM publique", "/video-publicitaire-stockkonect.webm", { method: "HEAD", status: 200, type: "video/webm" });
await check("Tableau de bord protégé", "/dashboard", { status: 307, location: "/login" });
await check("API produits protégée", "/api/products", { status: 401, type: "application/json" });

console.log(`Cible : ${BASE}`);
for (const result of results) console.log(`${result.ok ? "OK   " : "FAIL "}${result.name} — ${result.detail}`);
const failures = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failures}/${results.length} contrôles passés${failures ? ` · ${failures} échec(s)` : ""}.`);
if (failures) process.exitCode = 1;
