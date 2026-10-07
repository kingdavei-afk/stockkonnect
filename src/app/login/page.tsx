import Link from "next/link";
import Image from "next/image";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ accountUpdated?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <Link href="/" aria-label="Stockkonect — accueil">
            <Image src="/stockkonect-logo.svg" alt="Stockkonect" width={680} height={136} priority className="h-12 w-auto" />
          </Link>
        </div>
        <div className="card p-8">
          <h1 className="text-xl font-bold">Connexion</h1>
          <p className="mt-1 text-sm text-slate-500">
            Accédez à votre espace de gestion de stock.
          </p>
          <LoginForm accountUpdated={params.accountUpdated === "1"} />
          <p className="mt-6 text-center text-sm text-slate-500">
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-medium text-indigo-600 hover:underline">
              Créer un compte
            </Link>
          </p>
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">
            Démo : demo@stockkonect.fr / demo1234
          </p>
        </div>
      </div>
    </main>
  );
}
