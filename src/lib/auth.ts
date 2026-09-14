import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { SESSION_COOKIE, signSession, verifySession } from "./jwt";
import type { SessionPayload } from "./jwt";

type UserWithOrg = Prisma.UserGetPayload<{
  include: { organization: { include: { settings: true } } };
}>;

/** Utilisateur dont l'organisation est garantie non nulle (comptes d'entreprise). */
export type OrgUser = Omit<UserWithOrg, "organizationId" | "organization"> & {
  organizationId: string;
  organization: NonNullable<UserWithOrg["organization"]>;
};

/**
 * Renvoie l'utilisateur de l'organisation connecté (null pour un super-admin).
 * Refuse les comptes sans organisation ou dont l'organisation est suspendue.
 */
export async function getSessionUser(): Promise<OrgUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  if (!payload.orgId) return null; // super-admin → pas un utilisateur d'organisation
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { organization: { include: { settings: true } } },
  });
  if (!user || !user.organization || user.organization.status === "SUSPENDED") return null;
  return user as OrgUser;
}

/** Compte de session quelconque (utilisateur d'org ou super-admin). */
export async function getSessionAccount() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  return db.user.findUnique({
    where: { id: payload.userId },
    include: { organization: { include: { settings: true } } },
  });
}

export function isSuperAdmin(account: { role: string } | null): boolean {
  return account?.role === "SUPER_ADMIN";
}

export function isAdmin(account: { role: string } | null): boolean {
  return account?.role === "ADMIN";
}

export async function startSession(payload: SessionPayload) {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
