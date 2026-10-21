import { createHash } from "node:crypto";
import { canonicalIdentifier } from "./login-identifier";

/**
 * Limitation des tentatives sur les endpoints d'authentification.
 *
 * Un « succès » n'a pas le même sens selon l'endpoint : une connexion réussie
 * prouve que la saisie n'était pas une attaque (on efface le compteur), alors
 * qu'une inscription réussie est justement ce qu'un spammeur cherche à répéter
 * (on la compte). Le cœur ci-dessous ne connaît donc que des « événements » ;
 * chaque route décide quand en enregistrer un et quand effacer.
 *
 * La fenêtre est glissante : on compte les événements survenus dans les
 * `windowMs` dernières millisecondes et ils en sortent un par un. Une fenêtre
 * fixe (alignée sur l'heure ronde) laisserait repartir toute la rafale d'un
 * coup au basculement ; ici le débit reste borné dans le temps.
 *
 * Le stockage est abstrait pour rester testable sans base : la version Prisma
 * vit dans `auth-rate-limit.ts`.
 */

export type AuthAction = "login" | "register";

export type AuthRateLimitPolicy = {
  /** Fenêtre glissante observée. */
  windowMs: number;
  /** Événements autorisés par identifiant dans la fenêtre. */
  identifier: number;
  /** Événements autorisés par adresse IP dans la fenêtre. */
  ip: number;
  /** Groupe nominal utilisé dans le message d'erreur. */
  label: string;
  /**
   * Composition de la portée « identifiant ».
   *
   * - `"id"` : l'identifiant seul. La connexion l'utilise : un compte doit
   *   rester protégé même quand l'attaque vient de plusieurs adresses.
   * - `"id-ip"` : l'identifiant *et* l'IP réunis. L'inscription l'utilise :
   *   sinon, qui connaît une adresse peut la bloquer une heure durant en
   *   brûlant son budget depuis sa propre machine.
   */
  identifierScope: "id" | "id-ip";
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const AUTH_RATE_LIMITS: Record<AuthAction, AuthRateLimitPolicy> = {
  // Connexion : protège un compte donné (5 essais) et empêche de balayer
  // beaucoup de comptes depuis une même source (20 essais).
  login: {
    windowMs: 15 * MINUTE,
    identifier: 5,
    ip: 20,
    label: "tentatives de connexion",
    identifierScope: "id",
  },
  // Inscription : une entreprise réelle n'a besoin que d'un compte. Le budget
  // par email est lié à l'IP qui le consomme (portée « id-ip ») pour qu'un
  // tiers ne puisse pas bloquer une adresse connue ; celui par IP freine la
  // création en série depuis une même source.
  register: {
    windowMs: HOUR,
    identifier: 5,
    ip: 10,
    label: "tentatives d'inscription",
    identifierScope: "id-ip",
  },
};

/** Durée de conservation des événements : au-delà, aucun compteur ne les lit. */
export const AUTH_RATE_LIMIT_RETENTION_MS = 24 * HOUR;

/**
 * Cadence de la purge automatique. La purge supprime les événements plus
 * vieux que la rétention ; la limiter à une fois par heure évite de répéter
 * un DELETE sur chaque requête.
 */
export const AUTH_RATE_LIMIT_PURGE_INTERVAL_MS = HOUR;

export type AuthRateLimitSubject = {
  identifier?: string | null;
  ip?: string | null;
};

export type AuthRateLimitResult =
  | { limited: false }
  | { limited: true; retryAfterSeconds: number };

export type AuthRateLimitScope = "id" | "ip" | "id-ip";

/**
 * Stockage minimal attendu : ajouter des événements, lire les N plus récents
 * depuis une date, supprimer une portée, purger les événements trop anciens.
 */
export type AuthRateLimitStore = {
  add(keys: string[]): Promise<void>;
  /** Horodatages (ms epoch) des `take` événements les plus récents depuis `since`. */
  timestamps(key: string, since: Date, take: number): Promise<number[]>;
  remove(key: string): Promise<void>;
  purgeBefore(date: Date): Promise<void>;
};

export type AuthRateLimiter = {
  check(action: AuthAction, subject: AuthRateLimitSubject): Promise<AuthRateLimitResult>;
  record(action: AuthAction, subject: AuthRateLimitSubject): Promise<void>;
  clear(action: AuthAction, subject: AuthRateLimitSubject): Promise<void>;
  /** Force la purge des événements expirés (cron, administration, tests). */
  purge(): Promise<void>;
};

/** Condensat : aucune adresse email ni numéro en clair n'est stocké. */
export function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Clé d'une portée. Le préfixe lisible (`login:id:`) permet de comprendre une
 * ligne en base ; la valeur, elle, est toujours condensée.
 *
 * La portée « id-ip » condense les deux parties séparément puis les
 * concatène : aucune ambiguïté possible entre deux paires email/IP.
 */
export function rateLimitKey(
  action: AuthAction,
  scope: AuthRateLimitScope,
  value: string,
  secondaryValue?: string
): string {
  const normalized =
    scope === "id"
      ? canonicalIdentifier(value)
      : scope === "ip"
        ? value.trim()
        : `${digest(canonicalIdentifier(value))}${digest((secondaryValue ?? "").trim())}`;
  return `${action}:${scope}:${digest(normalized)}`;
}

/**
 * Clé de la portée « identifiant » d'une tentative, selon la politique de
 * l'endpoint. L'inscription retombe sur la seule adresse quand l'IP est
 * inconnue (pas d'en-tête proxy) : la protection reste présente.
 */
export function identifierScopeKey(
  action: AuthAction,
  subject: AuthRateLimitSubject
): string | null {
  const policy = AUTH_RATE_LIMITS[action];
  if (!subject.identifier) return null;
  if (policy.identifierScope === "id-ip" && subject.ip) {
    return rateLimitKey(action, "id-ip", subject.identifier, subject.ip);
  }
  return rateLimitKey(action, "id", subject.identifier);
}

/** Portées à surveiller pour une tentative donnée (identifiant et/ou IP). */
export function rateLimitScopes(
  action: AuthAction,
  subject: AuthRateLimitSubject
): Array<{ key: string; max: number }> {
  const policy = AUTH_RATE_LIMITS[action];
  const scopes: Array<{ key: string; max: number }> = [];
  const identifierKey = identifierScopeKey(action, subject);
  if (identifierKey) {
    scopes.push({ key: identifierKey, max: policy.identifier });
  }
  if (subject.ip) {
    scopes.push({ key: rateLimitKey(action, "ip", subject.ip), max: policy.ip });
  }
  return scopes;
}

export function rateLimitMessage(action: AuthAction, retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Trop de ${AUTH_RATE_LIMITS[action].label}. Réessayez dans ${minutes} minute${
    minutes > 1 ? "s" : ""
  }.`;
}

/** Adresse IP du client derrière le proxy (Vercel place l'origine en tête). */
export function clientIp(req: { headers: { get(name: string): string | null } }): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return req.headers.get("x-real-ip")?.trim() || null;
}

export type CreateAuthRateLimiterOptions = {
  store: AuthRateLimitStore;
  /** Horloge injectable, pour tester les fenêtres sans attendre. */
  now?: () => number;
};

/**
 * Secondes restantes avant que la portée repasse sous sa limite, 0 si elle est
 * encore disponible. On lit au plus `max` événements récents : le blocage tombe
 * exactement quand le plus ancien d'entre eux sort de la fenêtre, et le délai
 * se recalcule à chaque appel (fenêtre glissante).
 */
async function retryAfterSeconds(
  store: AuthRateLimitStore,
  scope: { key: string; max: number },
  windowMs: number,
  nowMs: number
): Promise<number> {
  const events = await store.timestamps(scope.key, new Date(nowMs - windowMs), scope.max);
  if (events.length < scope.max) return 0;
  const oldest = events[events.length - 1];
  return Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000));
}

export function createAuthRateLimiter({
  store,
  now = Date.now,
}: CreateAuthRateLimiterOptions): AuthRateLimiter {
  let lastPurgeAt = Number.NEGATIVE_INFINITY;

  /**
   * Purge automatique : les événements plus vieux que la rétention ne servent
   * plus à aucun compteur (la fenêtre la plus longue dure une heure), on les
   * supprime donc au plus une fois par intervalle, au passage d'une requête.
   * Aucun ordonnanceur externe n'est nécessaire et la table reste bornée.
   */
  async function purge(): Promise<void> {
    const current = now();
    lastPurgeAt = current;
    try {
      await store.purgeBefore(new Date(current - AUTH_RATE_LIMIT_RETENTION_MS));
    } catch {
      // Une purge ratée ne doit jamais faire échouer une requête.
    }
  }

  async function purgeIfDue(): Promise<void> {
    if (now() - lastPurgeAt < AUTH_RATE_LIMIT_PURGE_INTERVAL_MS) return;
    await purge();
  }

  return {
    async check(action, subject) {
      await purgeIfDue();
      const policy = AUTH_RATE_LIMITS[action];
      let retryAfter = 0;
      for (const scope of rateLimitScopes(action, subject)) {
        retryAfter = Math.max(
          retryAfter,
          await retryAfterSeconds(store, scope, policy.windowMs, now())
        );
      }
      return retryAfter > 0 ? { limited: true, retryAfterSeconds: retryAfter } : { limited: false };
    },

    async record(action, subject) {
      const scopes = rateLimitScopes(action, subject);
      if (scopes.length === 0) return;
      await store.add(scopes.map((scope) => scope.key));
      await purgeIfDue();
    },

    /** Ne touche qu'à la portée identifiant : voir `clear` côté route. */
    async clear(action, subject) {
      const key = identifierScopeKey(action, subject);
      if (!key) return;
      await store.remove(key);
    },

    purge,
  };
}
