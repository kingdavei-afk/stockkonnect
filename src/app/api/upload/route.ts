import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE = 4 * 1024 * 1024; // 4 Mo

/**
 * Upload d'images compatible serverless (Vercel) : le système de fichiers y est
 * en lecture seule, donc l'image est renvoyée en data URL stockée en base
 * (colonne Product.image, TEXT). Alternative production : passer à un stockage
 * objet (S3, Cloudinary) et renvoyer son URL publique.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté (PNG, JPEG, WebP, GIF)" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 4 Mo)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  return NextResponse.json({ url: dataUrl });
}
