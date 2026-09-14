import Link from "next/link";
import { RegisterForm } from "./register-form";
import { Boxes } from "lucide-react";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-2xl font-bold text-slate-900">
          <Boxes className="h-8 w-8 text-indigo-600" />
          Stockkonect
        </div>
        <div className="card p-8">
          <h1 className="text-xl font-bold">Créer un compte</h1>
          <p className="mt-1 text-sm text-slate-500">
            Lancez la gestion de stock de votre entreprise en 30 secondes.
          </p>
          <RegisterForm />
          <p className="mt-6 text-center text-sm text-slate-500">
            Déjà un compte ?{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
