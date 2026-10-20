-- La table sert désormais à plusieurs endpoints (connexion, inscription) :
-- on la renomme sans perdre les compteurs déjà enregistrés.
ALTER TABLE "LoginAttempt" RENAME TO "AuthRateLimitEvent";

ALTER INDEX "LoginAttempt_key_createdAt_idx" RENAME TO "AuthRateLimitEvent_key_createdAt_idx";
ALTER INDEX "LoginAttempt_createdAt_idx" RENAME TO "AuthRateLimitEvent_createdAt_idx";
