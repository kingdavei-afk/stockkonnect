import { NextResponse } from "next/server";

export const DEMO_ORGANIZATION_SLUG = "demo-sas";

/** Rejects server-side changes made from the public demonstration account. */
export function blockDemoWrites(user: { organization: { slug: string } }) {
  if (user.organization.slug !== DEMO_ORGANIZATION_SLUG) return null;
  return NextResponse.json(
    { error: "Le compte de démonstration est en lecture seule." },
    { status: 403 }
  );
}
