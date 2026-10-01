import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, getSessionAccount, isSuperAdmin } from "@/lib/auth";

const schema = z.object({
  currentPassword: z.string().min(1, "Saisissez votre mot de passe actuel"),
  email: z.string().trim().email("Adresse e-mail invalide").optional(),
  newPassword: z.string().min(16, "Le nouveau mot de passe doit contenir au moins 16 caractères").optional(),
});

export async function PATCH(req: NextRequest) {
  const account = await getSessionAccount();
  if (!account || !isSuperAdmin(account)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = parsed.data;
  const email = parsed.data.email?.toLowerCase() ?? account.email;
  if (!(await bcrypt.compare(currentPassword, account.passwordHash))) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });
  }

  const emailChanged = email !== account.email;
  if (!emailChanged && !newPassword) {
    return NextResponse.json({ error: "Indiquez une nouvelle adresse e-mail ou un nouveau mot de passe" }, { status: 400 });
  }

  if (emailChanged) {
    const existing = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing && existing.id !== account.id) {
      return NextResponse.json({ error: "Cette adresse e-mail est déjà utilisée" }, { status: 409 });
    }
  }

  await db.user.update({
    where: { id: account.id },
    data: {
      email,
      ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 12) } : {}),
      sessionVersion: { increment: 1 },
    },
  });

  // Invalide aussi les sessions ouvertes sur d'autres appareils grâce à sessionVersion.
  await endSession();
  return NextResponse.json({ ok: true, email });
}
