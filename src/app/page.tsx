import Link from "next/link";
import { Boxes, BarChart3, ScanBarcode, ArrowLeftRight } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Boxes className="h-7 w-7 text-indigo-400" />
          StockFlow
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/login" className="btn text-white hover:bg-white/10">
            Se connecter
          </Link>
          <Link href="/register" className="btn bg-indigo-500 hover:bg-indigo-400">
            Essai gratuit
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-24 pt-16 text-center sm:px-6">
        <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-tight sm:text-6xl">
          Gérez votre stock,{" "}
          <span className="text-indigo-400">simplement.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
          Produits, mouvements d&apos;entrée/sortie, ventes, approvisionnements,
          clients et alertes de stock bas — tout votre inventaire au même endroit.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/register"
            className="btn bg-indigo-500 px-6 py-3 text-base hover:bg-indigo-400"
          >
            Créer mon compte
          </Link>
          <Link
            href="/login"
            className="btn border border-white/20 px-6 py-3 text-base hover:bg-white/10"
          >
            Voir la démo
          </Link>
        </div>

        <div className="mt-20 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Boxes,
              title: "Produits & catalogues",
              desc: "SKU, codes-barres, photos, catégories, fournisseurs.",
            },
            {
              icon: ArrowLeftRight,
              title: "Mouvements de stock",
              desc: "Entrées, sorties et ajustements tracés en temps réel.",
            },
            {
              icon: BarChart3,
              title: "Tableau de bord",
              desc: "Valeur du stock, ventes, graphiques et KPI.",
            },
            {
              icon: ScanBarcode,
              title: "Codes-barres",
              desc: "Étiquettes imprimables et recherche rapide.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <Icon className="h-8 w-8 text-indigo-400" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-300">{desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-16 text-sm text-slate-400">
          Compte démo : demo@stockflow.fr / demo1234
        </p>
      </section>
    </main>
  );
}
