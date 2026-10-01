import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "sf_session";

const configuredSecret = process.env.AUTH_SECRET?.trim();
if (process.env.NODE_ENV === "production" && !configuredSecret) {
  throw new Error("AUTH_SECRET doit être défini en production pour signer les sessions.");
}

const secretValue = configuredSecret ?? "local-development-only-secret-do-not-use-in-production";
const secret = new TextEncoder().encode(secretValue);
if (secret.byteLength < 32) {
  throw new Error("AUTH_SECRET doit contenir au moins 32 octets.");
}

export type SessionPayload = { userId: string; orgId: string; role: string; sessionVersion: number };

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.userId !== "string" ||
      typeof payload.orgId !== "string" ||
      typeof payload.role !== "string" ||
      (payload.sessionVersion !== undefined &&
        (typeof payload.sessionVersion !== "number" || !Number.isSafeInteger(payload.sessionVersion)))
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      orgId: payload.orgId,
      role: payload.role,
      // Les anciens jetons n'avaient pas cette revendication : ils commencent à la version 0.
      sessionVersion: typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0,
    };
  } catch {
    return null;
  }
}
