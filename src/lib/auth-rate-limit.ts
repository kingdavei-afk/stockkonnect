import { db } from "./db";
import { createAuthRateLimiter, type AuthRateLimitStore } from "./auth-rate-limit-core";

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

export {
  AUTH_RATE_LIMITS,
  AUTH_RATE_LIMIT_RETENTION_MS,
  clientIp,
  rateLimitKey,
  rateLimitMessage,
  rateLimitScopes,
} from "./auth-rate-limit-core";
export type {
  AuthAction,
  AuthRateLimitPolicy,
  AuthRateLimitResult,
  AuthRateLimitSubject,
} from "./auth-rate-limit-core";
