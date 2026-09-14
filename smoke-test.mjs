const BASE = process.env.BASE ?? "http://127.0.0.1:3100";

async function check(path, opts = {}) {
  const res = await fetch(BASE + path, { redirect: "manual", ...opts });
  return {
    status: res.status,
    location: res.headers.get("location"),
    setCookie: res.headers.getSetCookie?.() ?? [],
  };
}

function log(name, r) {
  console.log(
    name.padEnd(36),
    r.status,
    r.location ? "-> " + r.location : "",
    r.setCookie?.length ? "(cookie reçu)" : ""
  );
}

// Pages publiques
log("GET /", await check("/"));
log("GET /login", await check("/login"));

// Page protégée sans session
log("GET /dashboard (sans session)", await check("/dashboard"));

// API protégée sans session
log("GET /api/products (sans session)", await check("/api/products"));

// Connexion
const login = await check("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "demo@stockflow.fr", password: "demo1234" }),
});
log("POST /api/auth/login (démo)", login);

// Mauvais mot de passe
log(
  "POST /api/auth/login (mauvais mdp)",
  await check("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "demo@stockflow.fr", password: "nope" }),
  })
);

const cookie = login.setCookie.map((c) => c.split(";")[0]).join("; ");
const auth = { headers: { cookie } };

// Pages authentifiées
for (const p of [
  "/dashboard",
  "/products",
  "/movements",
  "/sales",
  "/purchases",
  "/customers",
  "/categories",
  "/suppliers",
  "/settings",
]) {
  log("GET " + p, await check(p, auth));
}

// APIs authentifiées
log("GET /api/products", await check("/api/products", auth));
const products = await (await fetch(BASE + "/api/products", auth)).json();
console.log("   Produits en base :", products.map((p) => `${p.name} (${p.quantity})`).join(", "));

// Test business : vente puis vérif du stock
const target = products.find((p) => p.quantity >= 2);
if (target) {
  const before = target.quantity;
  const saleRes = await fetch(BASE + "/api/sales", {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ productId: target.id, quantity: 1 }] }),
  });
  log(`POST /api/sales (1x ${target.name})`, { status: saleRes.status });
  const after = await (await fetch(BASE + "/api/products", auth)).json();
  const updated = after.find((p) => p.id === target.id);
  console.log(
    `   Stock ${target.name} : ${before} -> ${updated.quantity} ${updated.quantity === before - 1 ? "OK" : "ERREUR"}`
  );

  // Mouvement de sortie refusé si stock insuffisant
  const tooMuch = await fetch(BASE + "/api/movements", {
    method: "POST",
    headers: { cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ productId: target.id, type: "OUT", quantity: 999999 }),
  });
  log("POST /api/movements (stock insuffisant)", { status: tooMuch.status });
}

console.log("\nSmoke test terminé.");
