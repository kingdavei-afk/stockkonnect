import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  AUTH_RATE_LIMITS,
  AUTH_RATE_LIMIT_PURGE_INTERVAL_MS,
  AUTH_RATE_LIMIT_RETENTION_MS,
  clientIp,
  createAuthRateLimiter,
  digest,
  identifierScopeKey,
  rateLimitKey,
  rateLimitMessage,
  type AuthRateLimitStore,
} from "../src/lib/auth-rate-limit-core";

/**
 * Suite sans base ni réseau : les mêmes règles que la production, exécutées
 * contre un stockage en mémoire et une horloge contrôlée.
 */

class MemoryStore implements AuthRateLimitStore {
  readonly events = new Map<string, number[]>();
  /** Dates des purges déclenchées, pour vérifier leur cadence. */
  readonly purges: Date[] = [];
  /** Simule une purge en échec. */
  failPurge = false;

  constructor(private readonly now: () => number) {}

  async add(keys: string[]) {
    const at = this.now();
    for (const key of keys) {
      this.events.set(key, [...(this.events.get(key) ?? []), at]);
    }
  }

  async timestamps(key: string, since: Date, take: number) {
    return (this.events.get(key) ?? [])
      .filter((at) => at >= since.getTime())
      .sort((a, b) => b - a)
      .slice(0, take);
  }

  async remove(key: string) {
    this.events.delete(key);
  }

  async purgeBefore(date: Date) {
    this.purges.push(date);
    if (this.failPurge) throw new Error("purge impossible");
    for (const [key, list] of this.events) {
      const kept = list.filter((at) => at >= date.getTime());
      if (kept.length > 0) this.events.set(key, kept);
      else this.events.delete(key);
    }
  }
}

function setup() {
  let clock = Date.UTC(2026, 9, 20, 12, 0, 0);
  const now = () => clock;
  const store = new MemoryStore(now);
  const limiter = createAuthRateLimiter({ store, now });
  return {
    store,
    limiter,
    now,
    advance(ms: number) {
      clock += ms;
    },
  };
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
/** Même numéro WhatsApp, écrit de cinq façons différentes. */
const WHATSAPP_VARIANTS = [
  "+225 07 99 88 77 66",
  "00225 07 99 88 77 66",
  "+2250799887766",
  "07 99 88 77 66",
  "0799887766",
];

describe("limitation de la connexion", () => {
  test("bloque au-delà de 5 échecs pour un identifiant", async () => {
    const { limiter } = setup();
    const identifier = "demo@example.fr";

    for (let i = 0; i < 5; i++) {
      await limiter.record("login", { identifier, ip: `10.0.0.${i}` });
      const check = await limiter.check("login", { identifier, ip: `10.0.0.${i}` });
      if (i < 4) assert.deepEqual(check, { limited: false }, `essai ${i + 1} encore autorisé`);
    }

    const blocked = await limiter.check("login", { identifier, ip: "10.0.1.1" });
    assert.equal(blocked.limited, true);
    assert.equal(blocked.limited && blocked.retryAfterSeconds, 15 * 60);
  });

  test("un essai refusé ne prolonge pas le blocage", async () => {
    const { limiter, advance, store } = setup();
    const identifier = "demo@example.fr";
    for (let i = 0; i < 5; i++) await limiter.record("login", { identifier, ip: `10.0.0.${i}` });

    const before = await limiter.check("login", { identifier });
    assert.equal(before.limited && before.retryAfterSeconds, 15 * 60);

    // La route ne doit rien enregistrer quand elle bloque : le délai décroît.
    advance(MINUTE);
    const after = await limiter.check("login", { identifier });
    assert.equal(after.limited && after.retryAfterSeconds, 14 * 60);
    assert.equal(store.events.get(rateLimitKey("login", "id", identifier))?.length, 5);
  });

  test("la fenêtre glisse : les événements sortent un par un", async () => {
    const { limiter, advance } = setup();
    const identifier = "demo@example.fr";

    // Trois échecs puis, dix minutes plus tard, deux autres.
    for (let i = 0; i < 3; i++) await limiter.record("login", { identifier, ip: "10.0.10.1" });
    advance(10 * MINUTE);
    for (let i = 0; i < 2; i++) await limiter.record("login", { identifier, ip: "10.0.10.1" });

    const blocked = await limiter.check("login", { identifier, ip: "10.0.10.1" });
    assert.equal(blocked.limited, true);
    // Le délai correspond au plus ancien événement, pas à un bloc entier.
    assert.equal(blocked.limited && blocked.retryAfterSeconds, 5 * 60);

    // Passé la fenêtre du plus ancien, seuls les deux récents subsistent :
    // une fenêtre fixe les aurait tous gardés jusqu'au prochain quart d'heure.
    advance(5 * MINUTE + 1000);
    assert.deepEqual(await limiter.check("login", { identifier, ip: "10.0.10.1" }), {
      limited: false,
    });
  });

  test("le délai restant suit la sortie du plus ancien événement", async () => {
    const { limiter, advance } = setup();
    const identifier = "demo@example.fr";
    for (let i = 0; i < 5; i++) await limiter.record("login", { identifier, ip: "10.0.11.1" });

    const initial = await limiter.check("login", { identifier });
    assert.equal(initial.limited, true);
    assert.equal(initial.limited && initial.retryAfterSeconds, 15 * 60);

    advance(5 * MINUTE);
    const after = await limiter.check("login", { identifier });
    assert.equal(after.limited, true);
    assert.equal(after.limited && after.retryAfterSeconds, 10 * 60);
  });

  test("les écritures d'un même numéro partagent un seul compteur", async () => {
    const { limiter } = setup();
    for (const [i, variant] of WHATSAPP_VARIANTS.slice(0, 5).entries()) {
      await limiter.record("login", { identifier: variant, ip: `10.0.2.${i}` });
    }

    for (const variant of WHATSAPP_VARIANTS) {
      const check = await limiter.check("login", { identifier: variant, ip: null });
      assert.equal(check.limited, true, `« ${variant} » doit être bloqué`);
    }
  });

  test("3 échecs sur un numéro restent sous la limite et n'affectent pas un autre identifiant", async () => {
    const { limiter } = setup();
    for (let i = 0; i < 3; i++) {
      await limiter.record("login", { identifier: "+225 07 99 88 77 66", ip: `10.0.3.${i}` });
    }
    assert.equal((await limiter.check("login", { identifier: "00225 07 99 88 77 66" })).limited, false);
    assert.equal((await limiter.check("login", { identifier: "autre@example.fr" })).limited, false);
  });

  test("un email se compare sans casse ni espaces", async () => {
    const { limiter } = setup();
    for (let i = 0; i < 5; i++) {
      await limiter.record("login", { identifier: "Demo@Example.FR", ip: `10.0.4.${i}` });
    }
    assert.equal((await limiter.check("login", { identifier: "  demo@example.fr  " })).limited, true);
  });

  test("une connexion réussie remet le compteur de l'identifiant à zéro", async () => {
    const { limiter } = setup();
    const identifier = "demo@example.fr";
    for (let i = 0; i < 4; i++) await limiter.record("login", { identifier, ip: `10.0.5.${i}` });

    await limiter.clear("login", { identifier });
    assert.deepEqual(await limiter.check("login", { identifier, ip: "10.0.5.9" }), { limited: false });

    // Le compteur repart de zéro : quatre nouveaux échecs restent autorisés.
    for (let i = 0; i < 4; i++) await limiter.record("login", { identifier, ip: `10.0.6.${i}` });
    assert.deepEqual(await limiter.check("login", { identifier }), { limited: false });

    await limiter.record("login", { identifier, ip: "10.0.6.9" });
    assert.equal((await limiter.check("login", { identifier })).limited, true);
  });

  test("le succès ne réarme pas le compteur d'adresse IP", async () => {
    const { limiter } = setup();
    const ip = "198.51.100.7";
    const identifiers = Array.from({ length: 20 }, (_, i) => `compte${i}@example.fr`);
    for (const identifier of identifiers) await limiter.record("login", { identifier, ip });

    assert.equal((await limiter.check("login", { identifier: "nouveau@example.fr", ip })).limited, true);

    // Même après une connexion réussie sur l'un des comptes, l'IP reste bornée.
    await limiter.clear("login", { identifier: identifiers[0] });
    const stillBlocked = await limiter.check("login", { identifier: "encore-un-autre@example.fr", ip });
    assert.equal(stillBlocked.limited, true);
  });

  test("20 échecs depuis une IP bloquent une nouvelle IP-source, pas les autres", async () => {
    const { limiter } = setup();
    for (let i = 0; i < 20; i++) {
      await limiter.record("login", { identifier: `balayage${i}@example.fr`, ip: "203.0.113.5" });
    }
    assert.equal(
      (await limiter.check("login", { identifier: "autre@example.fr", ip: "203.0.113.5" })).limited,
      true
    );
    assert.equal(
      (await limiter.check("login", { identifier: "autre@example.fr", ip: "203.0.113.6" })).limited,
      false
    );
  });

  test("le blocage expire au bout de la fenêtre", async () => {
    const { limiter, advance } = setup();
    const identifier = "demo@example.fr";
    for (let i = 0; i < 5; i++) await limiter.record("login", { identifier, ip: `10.0.7.${i}` });

    advance(15 * MINUTE - 1000);
    assert.equal((await limiter.check("login", { identifier })).limited, true);

    advance(2000);
    assert.deepEqual(await limiter.check("login", { identifier }), { limited: false });
  });

  test("les clés stockées sont condensées et préfixées par l'endpoint", async () => {
    const { limiter, store } = setup();
    const identifier = "secret@example.fr";
    const ip = "203.0.113.9";
    await limiter.record("login", { identifier, ip });

    const keys = [...store.events.keys()];
    assert.equal(keys.length, 2);
    assert.deepEqual(
      keys.sort(),
      [rateLimitKey("login", "id", identifier), rateLimitKey("login", "ip", ip)].sort()
    );
    for (const key of keys) {
      assert.match(key, /^login:(id|ip):[0-9a-f]{64}$/);
      assert.ok(!key.includes("secret"));
      assert.ok(!key.includes("example.fr"));
      assert.ok(!key.includes(ip));
    }
  });
});

describe("purge automatique", () => {
  test("supprime les événements plus vieux que la rétention", async () => {
    const { limiter, store, now } = setup();
    const oldKey = rateLimitKey("login", "id", "vieux@example.fr");
    store.events.set(oldKey, [now() - AUTH_RATE_LIMIT_RETENTION_MS - 60 * MINUTE]);

    await limiter.record("login", { identifier: "recent@example.fr", ip: "10.0.8.1" });

    assert.equal(store.events.has(oldKey), false);
    assert.equal(store.events.size, 2, "seuls l'identifiant et l'IP restent");
  });

  test("ne se répète pas avant une heure, puis reprend", async () => {
    const { limiter, store, advance } = setup();

    await limiter.record("login", { identifier: "a@example.fr", ip: "10.0.9.1" });
    assert.equal(store.purges.length, 1, "la première requête purge");

    advance(30 * MINUTE);
    await limiter.record("login", { identifier: "b@example.fr", ip: "10.0.9.2" });
    assert.equal(store.purges.length, 1, "pas de seconde purge avant une heure");

    advance(AUTH_RATE_LIMIT_PURGE_INTERVAL_MS);
    await limiter.check("login", { identifier: "c@example.fr", ip: "10.0.9.3" });
    assert.equal(store.purges.length, 2, "la purge reprend une heure plus tard");
  });

  test("une purge en échec n'empêche pas la requête de se dérouler", async () => {
    const { limiter, store } = setup();
    store.failPurge = true;

    await limiter.record("login", { identifier: "demo@example.fr", ip: "10.0.9.9" });
    assert.deepEqual(await limiter.check("login", { identifier: "demo@example.fr" }), {
      limited: false,
    });
  });

  test("la purge manuelle vide les événements expirés", async () => {
    const { limiter, store, now } = setup();
    const oldKey = rateLimitKey("login", "id", "vieux@example.fr");
    store.events.set(oldKey, [now() - AUTH_RATE_LIMIT_RETENTION_MS - MINUTE]);

    await limiter.purge();

    assert.equal(store.events.has(oldKey), false);
  });
});

describe("limitation de l'inscription", () => {
  test("bloque au-delà de 5 demandes pour un même email depuis la même IP", async () => {
    const { limiter } = setup();
    const identifier = "spam@example.fr";
    const ip = "198.51.100.40";
    for (let i = 0; i < 5; i++) await limiter.record("register", { identifier, ip });

    const blocked = await limiter.check("register", { identifier: "  SPAM@example.fr ", ip });
    assert.equal(blocked.limited, true);
    assert.equal(blocked.limited && blocked.retryAfterSeconds, 60 * 60);
  });

  test("une autre IP ne peut pas bloquer un email connu", async () => {
    const { limiter } = setup();
    const identifier = "victime@example.fr";
    for (let i = 0; i < 5; i++) {
      await limiter.record("register", { identifier, ip: "198.51.100.41" });
    }

    assert.equal(
      (await limiter.check("register", { identifier, ip: "198.51.100.41" })).limited,
      true,
      "l'attaquant est bloqué sur sa propre adresse"
    );
    assert.equal(
      (await limiter.check("register", { identifier, ip: "198.51.100.42" })).limited,
      false,
      "la victime, depuis une autre adresse, n'est pas bloquée"
    );
  });

  test("le budget par IP reste indépendant des emails demandés", async () => {
    const { limiter } = setup();
    for (let i = 0; i < 10; i++) {
      await limiter.record("register", { identifier: `spam${i}@example.fr`, ip: "198.51.100.20" });
    }
    assert.equal(
      (await limiter.check("register", { identifier: "encore@example.fr", ip: "198.51.100.20" })).limited,
      true
    );
    assert.equal(
      (await limiter.check("register", { identifier: "encore@example.fr", ip: "198.51.100.21" })).limited,
      false
    );
  });

  test("les budgets connexion et inscription sont indépendants", async () => {
    const { limiter } = setup();
    const identifier = "demo@example.fr";
    for (let i = 0; i < 5; i++) await limiter.record("login", { identifier, ip: `10.1.1.${i}` });
    assert.equal((await limiter.check("login", { identifier })).limited, true);
    assert.deepEqual(await limiter.check("register", { identifier }), { limited: false });
  });

  test("une demande valide sans email ne consomme que le budget IP", async () => {
    const { limiter, store } = setup();
    await limiter.record("register", { identifier: null, ip: "198.51.100.30" });
    assert.deepEqual(
      [...store.events.keys()],
      [rateLimitKey("register", "ip", "198.51.100.30")]
    );
  });

  test("la portée de l'inscription associe l'email et l'IP", () => {
    const key = identifierScopeKey("register", {
      identifier: "victime@example.fr",
      ip: "198.51.100.42",
    });
    assert.ok(key?.startsWith("register:id-ip:"));
    assert.equal(
      key,
      identifierScopeKey("register", {
        identifier: "  VICTIME@example.fr ",
        ip: "198.51.100.42",
      })
    );
    assert.notEqual(
      key,
      identifierScopeKey("register", {
        identifier: "victime@example.fr",
        ip: "198.51.100.43",
      })
    );
  });
});

describe("messages et lecture de l'IP", () => {
  test("le message français s'accorde en minutes", () => {
    assert.equal(
      rateLimitMessage("login", 15 * 60),
      "Trop de tentatives de connexion. Réessayez dans 15 minutes."
    );
    assert.equal(
      rateLimitMessage("login", 30),
      "Trop de tentatives de connexion. Réessayez dans 1 minute."
    );
    assert.equal(
      rateLimitMessage("login", 61),
      "Trop de tentatives de connexion. Réessayez dans 2 minutes."
    );
    assert.equal(
      rateLimitMessage("register", 60 * 60),
      "Trop de tentatives d'inscription. Réessayez dans 60 minutes."
    );
  });

  test("l'IP vient du premier maillon de x-forwarded-for", () => {
    assert.equal(
      clientIp({ headers: new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }) }),
      "203.0.113.7"
    );
    assert.equal(clientIp({ headers: new Headers({ "x-real-ip": "203.0.113.8" }) }), "203.0.113.8");
    assert.equal(
      clientIp({ headers: new Headers({ "x-forwarded-for": "  ", "x-real-ip": "203.0.113.9" }) }),
      "203.0.113.9"
    );
    assert.equal(clientIp({ headers: new Headers() }), null);
  });

  test("les politiques exposées correspondent aux valeurs documentées", () => {
    assert.equal(AUTH_RATE_LIMITS.login.identifier, 5);
    assert.equal(AUTH_RATE_LIMITS.login.ip, 20);
    assert.equal(AUTH_RATE_LIMITS.login.windowMs, 15 * MINUTE);
    assert.equal(AUTH_RATE_LIMITS.login.identifierScope, "id");
    assert.equal(AUTH_RATE_LIMITS.register.identifier, 5);
    assert.equal(AUTH_RATE_LIMITS.register.ip, 10);
    assert.equal(AUTH_RATE_LIMITS.register.windowMs, 60 * MINUTE);
    assert.equal(AUTH_RATE_LIMITS.register.identifierScope, "id-ip");
    assert.equal(AUTH_RATE_LIMIT_RETENTION_MS, 24 * HOUR);
    assert.equal(AUTH_RATE_LIMIT_PURGE_INTERVAL_MS, HOUR);
  });

  test("le condensat ne contient jamais la valeur en clair", () => {
    assert.match(digest("demo@example.fr"), /^[0-9a-f]{64}$/);
    assert.notEqual(digest("demo@example.fr"), digest("demo@example.com"));
  });
});
