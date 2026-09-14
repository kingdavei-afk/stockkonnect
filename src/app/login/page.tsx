import Link from "next/link";
import { LoginForm } from "./login-form";
import { Boxes } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-2xl font-bold text-slate-900">
          <Boxes className="h-8 w-8 text-indigo-600" />
          StockFlow
        </div>
        <div className="card p-8">
          <h1 className="text-xl font-bold">Connexion</h1>
          <p className="mt-1 text-sm text-slate-500">
            Accédez à votre espace de gestion de stock.
          </p>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-slate-500">
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-medium text-indigo-600 hover:underline">
              Créer un compte
            </Link>
          </p>
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">
            Démo : demo@stockflow.fr / demo1234
          </p>
        </div>
      </div>
    </main>
  );
}
