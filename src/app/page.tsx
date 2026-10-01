import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeftRight,
  BarChart3,
  BellRing,
  BookOpen,
  Boxes,
  Check,
  MessageCircle,
  ScanBarcode,
  ShoppingCart,
} from "lucide-react";
import { PUBLIC_PLANS } from "@/lib/plans";

const WHATSAPP_URL =
  "https://wa.me/2250748323191?text=" +
  encodeURIComponent("Bonjour Stockkonect, je souhaite avoir des informations !");

const features = [
  {
    icon: Boxes,
    title: "Produits & catalogues",
    desc: "Organisez vos fiches produits, catégories, fournisseurs et codes-barres.",
  },
  {
    icon: ArrowLeftRight,
    title: "Mouvements de stock",
    desc: "Suivez les entrées, sorties et ajustements avec leur historique.",
  },
  {
    icon: ShoppingCart,
    title: "Ventes & achats",
    desc: "Enregistrez vos ventes et approvisionnements au même endroit.",
  },
  {
    icon: BellRing,
    title: "Alertes de stock bas",
    desc: "Repérez les produits à réapprovisionner avant la rupture.",
  },
  {
    icon: ScanBarcode,
    title: "Codes-barres & étiquettes",
    desc: "Retrouvez rapidement un produit et imprimez ses étiquettes.",
  },
  {
    icon: BarChart3,
    title: "Tableau de bord & exports",
    desc: "Consultez vos indicateurs et exportez vos données au format CSV.",
  },
];

const steps = [
  { number: "01", title: "Créez votre espace", desc: "Renseignez votre entreprise et ouvrez votre compte." },
  { number: "02", title: "Ajoutez vos produits", desc: "Créez votre catalogue et indiquez vos quantités de départ." },
  { number: "03", title: "Suivez votre activité", desc: "Enregistrez ventes et approvisionnements, puis consultez votre tableau de bord." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white">
      <header className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-6">
        <div className="flex w-full items-center justify-between sm:w-auto">
          <Image
            src="/stockkonect-logo-white.svg"
            alt="Stockkonect — gestion de stock simplifiée"
            width={680}
            height={136}
            priority
            className="h-8 w-auto sm:h-10"
          />
          <Link href="/login" className="btn border border-white/15 px-3 text-white hover:bg-white/10 sm:hidden">
            Connexion
          </Link>
        </div>
        <nav aria-label="Navigation principale" className="flex w-full items-center gap-2 sm:w-auto sm:justify-center">
          <Link href="/plans" className="btn px-3 text-slate-200 hover:bg-white/10 hover:text-white">
            Nos prix
          </Link>
          <a
            href="/guide-stockkonect.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="btn px-3 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <BookOpen aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">Guide PDF</span>
            <span className="hidden sm:inline">Apprendre StockKonect</span>
          </a>
          <a href="#fonctionnalites" className="btn hidden px-3 text-slate-200 hover:bg-white/10 hover:text-white md:inline-flex">
            Fonctionnalités
          </a>
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/login" className="btn text-white hover:bg-white/10">
            Se connecter
          </Link>
          <Link href="/register" className="btn bg-indigo-500 hover:bg-indigo-400">
            Essai gratuit
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-14 pt-12 text-center sm:px-6 sm:pb-20 sm:pt-20">
        <p className="mx-auto mb-5 inline-flex max-w-full items-center rounded-full border border-indigo-300/20 bg-indigo-300/10 px-4 py-2 text-xs font-semibold text-indigo-200 sm:text-sm">
          La gestion de stock en ligne pour les commerces et les entreprises
        </p>
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Votre stock sous contrôle, <span className="text-indigo-400">votre activité en avance.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:mt-6 sm:text-lg sm:leading-8">
          Produits, mouvements, ventes, approvisionnements, clients et alertes : gardez toute votre gestion de stock au même endroit.
        </p>
        <div className="mx-auto mt-8 flex w-full max-w-md flex-col justify-center gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:gap-4">
          <Link href="/register" className="btn w-full bg-indigo-500 px-6 py-3 text-base hover:bg-indigo-400 sm:w-auto">
            Démarrer mon essai gratuit
          </Link>
          <Link href="/login" className="btn w-full border border-white/20 px-6 py-3 text-base hover:bg-white/10 sm:w-auto">
            Accéder à la démo
          </Link>
        </div>
        <div className="mx-auto mt-5 flex max-w-3xl flex-col items-center justify-center gap-2 text-sm text-slate-300 sm:flex-row sm:gap-6">
          <span className="inline-flex items-center gap-2"><Check aria-hidden="true" className="h-4 w-4 text-emerald-400" /> Essai gratuit de 7 jours</span>
          <span className="hidden text-slate-600 sm:inline" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-2"><Check aria-hidden="true" className="h-4 w-4 text-emerald-400" /> Accessible en ligne</span>
          <span className="hidden text-slate-600 sm:inline" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-2"><Check aria-hidden="true" className="h-4 w-4 text-emerald-400" /> Assistance WhatsApp</span>
        </div>

        <div id="fonctionnalites" className="scroll-mt-6 pt-16 text-left sm:pt-24">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Un seul outil, toute votre activité</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Ce que vous pouvez faire avec StockKonect</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
              Une vue claire de vos produits et de chaque mouvement, depuis votre espace de gestion.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:p-6">
                <Icon aria-hidden="true" className="h-7 w-7 text-indigo-300" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{desc}</p>
              </article>
            ))}
          </div>
        </div>

        <section className="pt-16 sm:pt-24" aria-labelledby="demarrage-title">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Simple à prendre en main</p>
            <h2 id="demarrage-title" className="mt-2 text-2xl font-bold sm:text-3xl">Commencez en trois étapes</h2>
          </div>
          <div className="grid gap-3 text-left sm:grid-cols-3 sm:gap-5">
            {steps.map((step) => (
              <article key={step.number} className="rounded-2xl border border-white/10 bg-slate-950/25 p-5 sm:p-6">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-400/15 text-sm font-bold text-indigo-200">{step.number}</span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{step.desc}</p>
              </article>
            ))}
          </div>
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center text-sm text-slate-300">
            Vous préférez découvrir l&apos;outil avant de créer votre espace ?{" "}
            <Link href="/login" className="font-semibold text-indigo-300 underline decoration-indigo-300/50 underline-offset-4 hover:text-white">
              Connectez-vous au compte démo
            </Link>
            <span className="mt-2 block text-xs text-slate-400">demo@stockkonect.fr · mot de passe : demo1234 · consultation en lecture seule</span>
          </div>
        </section>

        <section id="offres" className="scroll-mt-6 pt-16 sm:pt-24" aria-labelledby="offres-title">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-300">Des formules pour votre croissance</p>
            <h2 id="offres-title" className="mt-2 text-2xl font-bold sm:text-3xl">Choisissez l&apos;offre adaptée</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">Essai gratuit pendant 7 jours, puis choisissez votre formule. L&apos;équipe vous accompagne sur WhatsApp.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 pt-2 text-left md:grid-cols-3 md:gap-5">
            {PUBLIC_PLANS.map((plan) => (
              <article key={plan.id} className={`relative flex flex-col rounded-2xl border p-5 sm:p-6 ${plan.highlight ? "border-indigo-400 bg-indigo-500/15 ring-1 ring-indigo-400/50" : "border-white/10 bg-white/[0.06]"}`}>
                {plan.highlight && <span className="absolute -top-3 left-5 rounded-full bg-indigo-400 px-3 py-1 text-xs font-bold text-slate-950">Le plus populaire</span>}
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-300">{plan.tagline}</p>
                <p className="mt-5 text-3xl font-bold">{plan.monthly.toLocaleString("fr-FR")} <span className="text-sm font-medium text-slate-300">F CFA / mois</span></p>
                <p className="mt-2 text-sm text-slate-300">Jusqu&apos;à {plan.maxProducts} produits · {plan.maxUsers} utilisateurs</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {plan.modules.slice(2, 5).map((module) => (
                    <li key={module} className="flex items-start gap-2"><Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{module}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <Link href="/plans" className="btn mx-auto mt-6 w-full border border-white/20 px-6 py-3 text-base hover:bg-white/10 sm:w-auto">
            Voir les tarifs et choisir une offre
          </Link>
          <p className="mt-3 text-xs text-slate-400">La souscription payante se fait avec notre équipe sur WhatsApp.</p>
        </section>

        <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-600/30 to-emerald-500/15 px-5 py-8 text-center sm:mt-24 sm:px-10 sm:py-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Prêt à mieux gérer votre stock ?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
            Créez votre espace en quelques minutes ou posez vos questions à notre équipe.
          </p>
          <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Link href="/register" className="btn w-full bg-indigo-500 px-6 py-3 hover:bg-indigo-400 sm:w-auto">Démarrer l&apos;essai gratuit</Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn w-full bg-emerald-500 px-6 py-3 hover:bg-emerald-400 sm:w-auto">
              <MessageCircle aria-hidden="true" className="h-4 w-4" /> Nous écrire sur WhatsApp
            </a>
          </div>
        </section>
      </section>

      <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-10">
        <div className="flex flex-col items-center gap-4 border-t border-white/10 pt-6 text-center text-sm text-slate-300 sm:flex-row sm:justify-between sm:text-left">
          <span>© {new Date().getFullYear()} Stockkonect — Gestion de stock</span>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500/15 px-4 py-3 font-medium text-emerald-300 transition hover:bg-emerald-500/25 hover:text-emerald-200 sm:w-auto"
          >
            <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
            Besoin d&apos;aide ? Contactez-nous sur WhatsApp
          </a>
        </div>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contacter Stockkonect sur WhatsApp"
          className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition hover:scale-105 hover:bg-emerald-400 sm:bottom-5 sm:right-5 sm:h-14 sm:w-14"
        >
          <MessageCircle aria-hidden="true" className="h-6 w-6 sm:h-7 sm:w-7" />
        </a>
      </footer>
    </main>
  );
}
