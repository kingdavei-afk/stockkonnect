import Link from "next/link";
import Image from "next/image";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <Link href="/" aria-label="Stockkonect — accueil">
            <Image src="/stockkonect-logo.svg" alt="Stockkonect" width={680} height={136} priority className="h-12 w-auto" />
          </Link>
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
