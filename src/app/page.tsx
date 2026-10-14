import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Boxes,
  Check,
  ChevronDown,
  CircleHelp,
  ContactRound,
  Eye,
  Layers3,
  MessageCircle,
  PackageCheck,
  ScanBarcode,
  ShoppingBag,
  Smartphone,
  Sparkles,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { PUBLIC_PLANS } from "@/lib/plans";

const WHATSAPP_URL =
  "https://wa.me/2250748323191?text=" +
  encodeURIComponent("Bonjour Stockkonect, je souhaite avoir des informations !");

const features = [
  {
    number: "01",
    icon: Boxes,
    title: "Un catalogue qui reste clair",
    desc: "Retrouvez produits, catégories, fournisseurs et codes-barres au même endroit.",
    detail: "Produits & catalogues",
  },
  {
    number: "02",
    icon: ArrowDownRight,
    title: "Chaque mouvement, tracé",
    desc: "Gardez l’historique des entrées, sorties et ajustements. Fini les quantités au hasard.",
    detail: "Mouvements de stock",
  },
  {
    number: "03",
    icon: ShoppingBag,
    title: "Ventes et achats réunis",
    desc: "Enregistrez ventes et approvisionnements dans un seul espace de gestion.",
    detail: "Ventes & approvisionnements",
  },
  {
    number: "04",
    icon: BellRing,
    title: "Anticipez les ruptures",
    desc: "Une alerte de stock bas vous signale les produits à réapprovisionner.",
    detail: "Alertes de stock bas",
  },
  {
    number: "05",
    icon: ScanBarcode,
    title: "Du code au bon produit",
    desc: "Identifiez rapidement vos articles et imprimez leurs étiquettes code-barres.",
    detail: "Codes-barres & étiquettes",
  },
  {
    number: "06",
    icon: UsersRound,
    title: "Une équipe sur la même page",
    desc: "Invitez vos collaborateurs selon la capacité prévue par votre formule.",
    detail: "Travail en équipe",
  },
];

const steps = [
  { number: "01", title: "Ouvrez votre espace", desc: "Renseignez votre entreprise et créez votre compte en quelques instants." },
  { number: "02", title: "Importez votre réalité", desc: "Ajoutez vos produits et indiquez vos quantités de départ." },
  { number: "03", title: "Pilotez au quotidien", desc: "Suivez ventes, approvisionnements et alertes depuis votre tableau de bord." },
];

const questions = [
  {
    question: "Comment fonctionne l’essai gratuit ?",
    answer: "Créez votre compte pour profiter de 7 jours d’essai. À la fin de l’essai, contactez notre équipe pour choisir une formule payante.",
    icon: CircleHelp,
  },
  {
    question: "Puis-je utiliser StockKonect sur mon téléphone ?",
    answer: "Oui. StockKonect s’ouvre dans le navigateur de votre téléphone, tablette ou ordinateur. Une connexion Internet est nécessaire.",
    icon: Smartphone,
  },
  {
    question: "Comment souscrire après l’essai ?",
    answer: "Les abonnements sont gérés manuellement : choisissez une offre et notre équipe vous indiquera la procédure sur WhatsApp. Aucun paiement en ligne n’est demandé sur cette page.",
    icon: MessageCircle,
  },
  {
    question: "Puis-je essayer avant de créer mon espace ?",
    answer: "Oui. Le compte démo permet de parcourir l’interface en lecture seule. Vous pouvez ensuite créer votre propre espace pour démarrer votre essai.",
    icon: Eye,
  },
];

function DashboardPreview() {
  return (
    <div className="product-stage" aria-label="Aperçu illustratif du tableau de bord StockKonect">
      <div className="stage-orbit stage-orbit-one" aria-hidden="true" />
      <div className="stage-orbit stage-orbit-two" aria-hidden="true" />
      <div className="stage-note stage-note-top">
        <span className="note-icon"><TrendingUp size={16} aria-hidden="true" /></span>
        <span><b>Tout est à jour</b><small>Vos mouvements sont enregistrés</small></span>
        <span className="note-dot" />
      </div>
      <div className="dashboard-window">
        <div className="dashboard-topbar">
          <div className="dashboard-brand">
            <span className="brand-glyph"><Layers3 size={15} aria-hidden="true" /></span>
            <span>stockkonect</span>
          </div>
          <div className="dashboard-top-right"><span className="topbar-date">Mon espace</span><span className="avatar">A</span></div>
        </div>
        <div className="dashboard-body">
          <aside className="dashboard-sidebar">
            <span className="sidebar-active"><BarChart3 size={14} />Vue d’ensemble</span>
            <span><Boxes size={14} />Produits</span>
            <span><ArrowDownRight size={14} />Mouvements</span>
            <span><ShoppingBag size={14} />Ventes</span>
            <span><ContactRound size={14} />Contacts</span>
            <span className="sidebar-mini-label">ESPACE DE TRAVAIL</span>
            <span><UsersRound size={14} />Équipe</span>
          </aside>
          <div className="dashboard-content">
            <div className="dash-heading">
              <div><span className="dash-eyebrow">MARDI 14 OCTOBRE</span><h3>Bonjour, Aïcha.</h3><p>Voici le point sur votre activité.</p></div>
              <span className="dash-action">Cette semaine <ChevronDown size={13} /></span>
            </div>
            <div className="metric-grid">
              <div className="metric-card"><span>Produits en stock</span><strong>1 248</strong><small><span className="metric-up">+ 12</span> ce mois-ci</small><span className="metric-mark violet"><Boxes size={15} /></span></div>
              <div className="metric-card"><span>Ventes enregistrées</span><strong>86</strong><small><span className="metric-up">+ 8,4 %</span> cette semaine</small><span className="metric-mark green"><TrendingUp size={15} /></span></div>
              <div className="metric-card metric-alert"><span>À réapprovisionner</span><strong>04</strong><small>Produits sous le seuil</small><span className="metric-mark amber"><BellRing size={15} /></span></div>
            </div>
            <div className="dashboard-lower">
              <div className="chart-card">
                <div className="chart-heading"><div><b>Activité des ventes</b><small>Les mouvements de la semaine</small></div><span className="chart-legend"><i /> Cette semaine</span></div>
                <div className="chart-area" aria-label="Graphique illustratif de l’activité de la semaine">
                  <div className="chart-y-labels"><span>120</span><span>80</span><span>40</span><span>0</span></div>
                  <div className="chart-plot"><div className="chart-gridline g1" /><div className="chart-gridline g2" /><div className="chart-gridline g3" /><div className="chart-bars"><i style={{ height: "37%" }} /><i style={{ height: "53%" }} /><i style={{ height: "45%" }} /><i style={{ height: "70%" }} /><i style={{ height: "61%" }} /><i style={{ height: "84%" }} /><i style={{ height: "72%" }} /></div><div className="chart-x-labels"><span>Lun.</span><span>Mar.</span><span>Mer.</span><span>Jeu.</span><span>Ven.</span><span>Sam.</span><span>Dim.</span></div></div>
                </div>
              </div>
              <div className="movement-card"><div className="movement-head"><b>Derniers mouvements</b><span>Voir tout <ArrowUpRight size={12} /></span></div><div className="movement-row"><span className="movement-icon move-in"><ArrowDownRight size={13} /></span><span className="movement-text"><b>Réception fournisseur</b><small>Cartons d’emballage</small></span><span className="movement-qty positive">+ 24</span></div><div className="movement-row"><span className="movement-icon move-out"><ArrowUpRight size={13} /></span><span className="movement-text"><b>Vente enregistrée</b><small>Café moulu · 250 g</small></span><span className="movement-qty">− 3</span></div><div className="movement-row"><span className="movement-icon move-in"><PackageCheck size={13} /></span><span className="movement-text"><b>Stock ajusté</b><small>Huile végétale · 1 L</small></span><span className="movement-qty positive">+ 6</span></div></div>
            </div>
          </div>
        </div>
        <div className="dashboard-bottom"><span><i className="live-dot" /> Espace de gestion actif</span><span>Données illustratives</span></div>
      </div>
      <div className="stage-note stage-note-bottom">
        <span className="stock-ring"><span /></span>
        <span><b>Stock sous contrôle</b><small>Les seuils restent visibles</small></span>
        <ArrowUpRight className="note-arrow" size={17} aria-hidden="true" />
      </div>
      <span className="stage-caption">APERÇU DU TABLEAU DE BORD</span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <div className="announcement-bar"><span className="announcement-sparkle"><Sparkles size={13} aria-hidden="true" /></span>Votre essai de 7 jours commence ici<span className="announcement-separator">·</span><Link href="/register">Créer mon espace <ArrowRight size={13} aria-hidden="true" /></Link></div>
      <header className="site-header">
        <div className="nav-shell">
          <Link href="/" aria-label="StockKonect — accueil" className="site-logo"><Image src="/stockkonect-logo.svg" alt="StockKonect" width={204} height={41} priority /></Link>
          <nav className="main-nav" aria-label="Navigation principale"><a href="#fonctionnalites">Fonctionnalités</a><a href="#demonstration">Découvrir</a><Link href="/plans">Tarifs</Link><a href="#faq">FAQ</a></nav>
          <div className="nav-actions"><Link href="/login" className="nav-login">Connexion</Link><Link href="/register" className="button button-nav">Essai gratuit <ArrowRight size={15} /></Link></div>
          <Link href="/register" className="mobile-cta" aria-label="Démarrer l’essai gratuit"><ArrowRight size={19} /></Link>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-shell">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" />POUR LES COMMERCES QUI VEULENT AVANCER</div>
            <h1>Le stock juste.<br /><span>Au bon moment.</span></h1>
            <p className="hero-description">Moins de suppositions, plus de visibilité. StockKonect réunit vos produits, vos ventes et vos approvisionnements dans un espace simple à piloter.</p>
            <div className="hero-actions"><Link href="/register" className="button button-primary">Démarrer mon essai gratuit <ArrowRight size={17} /></Link><Link href="/login" className="button button-secondary"><span className="play-symbol">▶</span> Voir la démo</Link></div>
            <div className="hero-assurance"><span><Check size={15} /> 7 jours gratuits</span><i /><span><Check size={15} /> Sans paiement en ligne</span></div>
            <div className="hero-contact">Une question avant de commencer ? <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Notre équipe est sur WhatsApp <ArrowUpRight size={13} /></a></div>
          </div>
          <div className="hero-visual"><DashboardPreview /></div>
        </div>
        <div className="hero-rule" />
      </section>

      <section className="proof-strip" aria-label="Informations sur StockKonect"><div className="proof-inner"><span className="proof-lead">UNE GESTION PLUS LISIBLE, AU QUOTIDIEN</span><div className="proof-item"><span className="proof-number">7<span> j</span></span><span>pour essayer<br />à votre rythme</span></div><div className="proof-item"><span className="proof-icon"><Smartphone size={19} /></span><span>Sur téléphone,<br />tablette ou ordinateur</span></div><div className="proof-item"><span className="proof-icon proof-whatsapp"><MessageCircle size={19} /></span><span>Un accompagnement<br />humain sur WhatsApp</span></div><Link href="/login" className="proof-demo">Parcourir la démo <ArrowUpRight size={15} /></Link></div></section>

      <section className="feature-section section-wrap" id="fonctionnalites">
        <div className="section-heading feature-heading"><div><span className="eyebrow"><span className="eyebrow-line" />UNE VUE CLAIRE, DU DÉBUT À LA FIN</span><h2>Votre activité, sans<br />les angles morts.</h2></div><p>Un seul espace pour savoir ce que vous avez, ce qui bouge et ce qui demande votre attention.</p></div>
        <div className="feature-grid">{features.map(({ number, icon: Icon, title, desc, detail }) => <article className="feature-card" key={number}><div className="feature-card-top"><span className="feature-icon"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span><span className="feature-number">{number}</span></div><h3>{title}</h3><p>{desc}</p><span className="feature-detail">{detail} <ArrowUpRight size={13} /></span></article>)}</div>
        <div className="feature-note"><span className="feature-note-icon"><BarChart3 size={20} /></span><p><b>Les chiffres utiles, sans tableur à reconstituer.</b><br />Consultez vos indicateurs et exportez vos données au format CSV.</p><Link href="/register" aria-label="Essayer StockKonect"><ArrowRight size={18} /></Link></div>
      </section>

      <section className="video-section" id="demonstration">
        <div className="video-shell"><div className="video-copy"><span className="eyebrow"><span className="eyebrow-line" />DÉCOUVREZ STOCKKONECT</span><h2>Un outil concret.<br /><span>Pas de mode d’emploi de 40 pages.</span></h2><p>Jetez un œil à l’interface et à la façon dont StockKonect vous aide à suivre l’activité de votre commerce.</p><div className="video-points"><span><Check size={15} /> Un tableau de bord lisible</span><span><Check size={15} /> Les opérations au même endroit</span><span><Check size={15} /> Accessible depuis votre navigateur</span></div><Link href="/login" className="text-link">Essayer la démo en lecture seule <ArrowRight size={15} /></Link></div><div className="video-frame"><div className="video-frame-inner"><video controls playsInline preload="metadata" poster="/video-stockkonect-poster.jpg" className="promo-video" aria-label="Vidéo de présentation de StockKonect"><source src="/video-publicitaire-stockkonect.webm" type="video/webm" /><source src="/video-publicitaire-stockkonect.mp4" type="video/mp4" />Votre navigateur ne prend pas en charge la lecture vidéo.</video></div><div className="video-meta"><span><span className="video-live-dot" /> VIDÉO DE PRÉSENTATION</span><span>StockKonect · 22 s</span></div></div></div>
      </section>

      <section className="process-section section-wrap" id="demarrage"><div className="section-heading process-heading"><div><span className="eyebrow"><span className="eyebrow-line" />VOTRE PREMIÈRE JOURNÉE</span><h2>En trois étapes,<br />vous y voyez clair.</h2></div><p>Commencez avec votre catalogue et vos quantités. Le reste se construit au fil de votre activité.</p></div><div className="steps-grid">{steps.map((step, index) => <article key={step.number} className="step-card"><div className="step-top"><span>{step.number}</span>{index < steps.length - 1 && <div className="step-line" />}</div><h3>{step.title}</h3><p>{step.desc}</p></article>)}</div><div className="demo-callout"><div className="demo-mark"><Eye size={19} /></div><div><b>Vous préférez regarder avant de vous lancer ?</b><p>Parcourez le compte démo en lecture seule.</p></div><Link href="/login" className="button button-outline">Ouvrir la démo <ArrowRight size={15} /></Link><small>demo@stockkonect.fr&nbsp; · &nbsp;demo1234</small></div></section>

      <section className="pricing-section" id="tarifs"><div className="section-wrap pricing-wrap"><div className="section-heading pricing-heading"><div><span className="eyebrow"><span className="eyebrow-line" />DES FORMULES SANS SURPRISE</span><h2>Choisissez votre<br />prochain palier.</h2></div><div className="pricing-intro"><p>Commencez par un essai de 7 jours, puis choisissez l’offre adaptée à votre activité.</p><span><Check size={14} /> Paiement annuel : 2 mois offerts</span></div></div><div className="pricing-grid">{PUBLIC_PLANS.map((plan, index) => <article key={plan.id} className={`price-card ${plan.highlight ? "price-card-featured" : ""}`}><div className="price-card-head"><div><span className="plan-index">0{index + 1} / 03</span><h3>{plan.name}</h3></div>{plan.highlight && <span className="popular-badge">LE PLUS CHOISI</span>}</div><p className="plan-tagline">{plan.tagline}</p><div className="price-amount"><span>{plan.monthly.toLocaleString("fr-FR")}</span><span>F CFA <small>/ mois</small></span></div><p className="plan-limit">Jusqu’à <b>{plan.maxProducts}</b> produits <i /> <b>{plan.maxUsers}</b> utilisateurs</p><div className="price-divider" /><ul>{plan.modules.slice(2, 5).map((module) => <li key={module}><Check size={15} />{module}</li>)}</ul><Link href="/register" className={`button ${plan.highlight ? "button-primary" : "button-outline"}`}>Démarrer l’essai <ArrowRight size={15} /></Link><p className="plan-note">7 jours gratuits · Sans paiement en ligne</p></article>)}</div><div className="pricing-footnote"><span><CircleHelp size={15} /> La souscription payante est accompagnée par notre équipe.</span><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Parler à l’équipe <ArrowUpRight size={14} /></a></div></div></section>

      <section className="faq-section section-wrap" id="faq"><div className="faq-heading"><span className="eyebrow"><span className="eyebrow-line" />LES RÉPONSES, SANS DÉTOUR</span><h2>Avant de vous lancer.</h2><p>Tout ce qu’il faut savoir pour démarrer simplement.</p><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-link">Une autre question ? Écrivez-nous <ArrowUpRight size={14} /></a></div><div className="faq-list">{questions.map(({ question, answer, icon: Icon }, index) => <details className="faq-item" key={question} open={index === 0}><summary><span className="faq-icon"><Icon size={17} /></span><span>{question}</span><ChevronDown size={16} className="faq-chevron" /></summary><p>{answer}</p></details>)}</div></section>

      <section className="closing-section"><div className="closing-inner"><div className="closing-mark"><Image src="/stockkonect-mark.svg" alt="" width={42} height={42} /></div><div><span className="eyebrow">LE BON MOMENT POUR Y VOIR CLAIR</span><h2>Votre stock mérite mieux<br />que des suppositions.</h2><p>Ouvrez votre espace, explorez l’outil et avancez à votre rythme.</p></div><div className="closing-actions"><Link href="/register" className="button button-light">Démarrer les 7 jours gratuits <ArrowRight size={16} /></Link><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="closing-contact"><MessageCircle size={15} /> Parler à notre équipe</a></div></div><div className="closing-ornament" aria-hidden="true" /></section>

      <footer className="site-footer"><div className="footer-main"><Link href="/" aria-label="StockKonect — accueil" className="footer-logo"><Image src="/stockkonect-logo.svg" alt="StockKonect" width={180} height={36} /></Link><p>Une gestion de stock simple,<br />pour avancer l’esprit tranquille.</p><nav aria-label="Liens de pied de page"><a href="#fonctionnalites">Fonctionnalités</a><Link href="/plans">Tarifs</Link><a href="/guide-stockkonect.pdf" target="_blank" rel="noopener noreferrer">Guide StockKonect</a><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Contact WhatsApp</a></nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} StockKonect. Tous droits réservés.</span><span>Conçu pour les commerces et les entreprises.</span><Link href="/login">Connexion <ArrowUpRight size={13} /></Link></div></footer>
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Contacter StockKonect sur WhatsApp" className="floating-whatsapp"><MessageCircle size={21} /></a>
    </main>
  );
}
