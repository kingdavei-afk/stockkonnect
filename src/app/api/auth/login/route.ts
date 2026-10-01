import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { email },
    include: { organization: { select: { status: true } } },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "Email ou mot de passe incorrect" },
      { status: 401 }
    );
  }

  if (user.organization?.status === "SUSPENDED") {
    return NextResponse.json(
      { error: "Votre entreprise est suspendue. Contactez le support." },
      { status: 403 }
    );
  }

  await startSession({
    userId: user.id,
    orgId: user.organizationId ?? "",
    role: user.role,
    sessionVersion: user.sessionVersion,
  });
  return NextResponse.json({ ok: true, role: user.role });
}
