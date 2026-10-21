import { db } from "./db";
import {
  createAuthRateLimiter,
  AUTH_RATE_LIMIT_RETENTION_MS,
  type AuthRateLimitStore,
} from "./auth-rate-limit-core";

/**
 * Stockage Prisma des événements de limitation.
 *
 * En base et non en mémoire parce que l'application tourne sur Vercel : chaque
 * requête peut atterrir sur une instance différente, un compteur local ne
 * verrait donc qu'une partie des essais.
 */
const prismaStore: AuthRateLimitStore = {
  async add(keys) {
    await db.authRateLimitEvent.createMany({ data: keys.map((key) => ({ key })) });
  },

  async timestamps(key, since, take) {
    const rows = await db.authRateLimitEvent.findMany({
      where: { key, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take,
      select: { createdAt: true },
    });
    return rows.map((row) => row.createdAt.getTime());
  },

  async remove(key) {
    await db.authRateLimitEvent.deleteMany({ where: { key } });
  },

  async purgeBefore(date) {
    await db.authRateLimitEvent.deleteMany({ where: { createdAt: { lt: date } } });
  },
};

export const authRateLimit = createAuthRateLimiter({ store: prismaStore });

/**
 * Purge immédiate des événements trop vieux pour qu'un compteur les lise.
 * La purge automatique du limiteur fait déjà le travail en continu ; cette
 * fonction sert à un cron ou à une action d'administration.
 */
export async function purgeExpiredAuthRateLimitEvents(): Promise<number> {
  const { count } = await db.authRateLimitEvent.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - AUTH_RATE_LIMIT_RETENTION_MS) } },
  });
  return count;
}

export {
  AUTH_RATE_LIMITS,
  AUTH_RATE_LIMIT_PURGE_INTERVAL_MS,
  AUTH_RATE_LIMIT_RETENTION_MS,
  clientIp,
  identifierScopeKey,
  rateLimitKey,
  rateLimitMessage,
  rateLimitScopes,
} from "./auth-rate-limit-core";
export type {
  AuthAction,
  AuthRateLimitPolicy,
  AuthRateLimitResult,
  AuthRateLimitScope,
  AuthRateLimitSubject,
} from "./auth-rate-limit-core";
