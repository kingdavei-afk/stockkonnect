import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/jwt";

const PUBLIC_PATHS = ["/", "/login", "/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    // Webhook serveur-à-serveur CinetPay (authentifié par re-vérification API)
    pathname === "/api/subscription/webhook";

  if (isPublic) {
    if (session && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL(session.role === "SUPER_ADMIN" ? "/admin" : "/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Routes super-admin réservées
  const isAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin");

  if (isAdminRoute && session.role !== "SUPER_ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Les super-admins n'ont rien à faire dans l'app organisation
  if (!isAdminRoute && session.role === "SUPER_ADMIN" && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:png|jpg|jpeg|svg|ico|webp|pdf)$).*)",
  ],
};
