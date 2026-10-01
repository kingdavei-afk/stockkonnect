import Link from "next/link";
import { Boxes, BarChart3, ScanBarcode, ArrowLeftRight, MessageCircle, BookOpen } from "lucide-react";

const WHATSAPP_URL =
  "https://wa.me/2250748323191?text=" +
  encodeURIComponent("Bonjour Stockkonect, je souhaite avoir des informations !");

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Boxes className="h-7 w-7 text-indigo-400" />
          Stockkonect
        </div>
        <nav aria-label="Navigation principale" className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
          <Link href="/plans" className="btn text-slate-200 hover:bg-white/10 hover:text-white">
            Nos Prix
          </Link>
          <a
            href="/guide-stockkonect.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="btn flex items-center gap-2 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <BookOpen className="h-4 w-4" />
            Apprendre StockKonect
          </a>
        </nav>
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
            </div>
          ))}
        </div>

        <p className="mt-16 text-sm text-slate-400">
          Compte démo : demo@stockkonect.fr / demo1234
        </p>
      </section>

      <footer className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="flex flex-col items-center gap-3 border-t border-white/10 pt-6 text-sm text-slate-300 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Stockkonect — Gestion de stock</span>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 font-medium text-emerald-300 transition hover:bg-emerald-500/25 hover:text-emerald-200"
          >
            <MessageCircle className="h-4 w-4" />
            Besoin d&apos;aide ? Contactez-nous sur WhatsApp
          </a>
        </div>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contacter Stockkonect sur WhatsApp"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition hover:scale-105 hover:bg-emerald-400"
        >
          <MessageCircle className="h-7 w-7" />
        </a>
      </footer>
    </main>
  );
}
