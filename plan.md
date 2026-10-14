# Refonte de la landing page StockKonect

## Objectif et périmètre
Refondre la page d’accueil existante de StockKonect afin de présenter clairement le SaaS aux commerces et entreprises, de renforcer la confiance et de convertir vers l’essai gratuit, la démo et le contact WhatsApp. Conserver les fonctionnalités, tarifs, modalités d’essai, textes d’aide, routes et ressources de marque vérifiés dans l’application. Ne pas inventer de clients, chiffres de performance, intégrations ou fonctionnalités.

## Benchmark concurrentiel
- Zoho Inventory : présentation en blocs de fonctionnalités, démonstration, preuve sociale, omnicanal, intégrations et tarification détaillée. Référence utile pour rendre le produit tangible et articuler les bénéfices.
- Shopify Inventory : message orienté contrôle des niveaux de stock, réapprovisionnement et ventes sur plusieurs canaux. Référence utile pour exprimer des tâches concrètes et les gains de sérénité.
- Monstock : couverture fonctionnelle très large, mobilité, flux et accompagnement. Différenciation à éviter ici : l’empilement de promesses. StockKonect peut gagner par la lisibilité, la simplicité, l’offre abordable en FCFA et le support humain.
- Cin7 : cadrage omnicanal/ERP orienté croissance et plans avancés. Ne pas reprendre ces promesses, absentes du produit StockKonect.

## Direction visuelle
- **Mouvement** : éditorial numérique contemporain, inspiré des rapports financiers modernes et des studios SaaS européens, avec une finition chaleureuse plutôt qu’un dégradé futuriste générique.
- **Principes** : clarté avant densité ; interface produit crédible ; espace généreux ; accents de couleur réservés aux actions et indicateurs.
- **Couleurs** : fond ivoire doux (#F7F7F2), encre bleu-noir (#17212B), violet indigo de marque (#6857E8), bleu pâle pour les surfaces, vert doux pour les statuts. Contraste net, éviter le fond intégralement sombre.
- **Composition** : hero éditorial en deux colonnes, aperçu du tableau de bord dans une fenêtre produit décentrée, grandes sections alternant fond clair et panneaux teintés, prix en cartes sobres.
- **Éléments signatures** : repères numériques discrets pour les étapes ; mini fenêtre produit avec graphiques CSS ; rubans / pastilles de statut issus du vocabulaire réel de StockKonect.
- **Interaction** : CTA directs vers `/register`, `/login`, `/plans` et WhatsApp déjà existants. Vidéo native avec contrôles. Navigation interne vers les sections. Mouvement CSS léger, sans effet qui gêne la lecture.
- **Animation** : transitions courtes de couleur/élévation au survol ; apparition douce des éléments seulement si faisable sans script ; respecter `prefers-reduced-motion`.
- **Typographie** : sans-serif système nette ; titre de hero à chasse serrée, sous-titres lisibles, petites capitales espacées pour les repères, chiffres tarifaires tabulaires.
- **Essence de marque** : l’outil de stock simple et accessible pour les commerces qui veulent savoir ce qu’ils ont, ce qui bouge et ce qu’il faut recommander. Personnalité : fiable, directe, humaine.
- **Voix** : affirmations concrètes, sans superlatifs invérifiables. Exemples : « Le stock juste. Au bon moment. » et « Une vue claire, de la réception à la vente. »
- **Marque / logotype** : conserver le logo officiel existant, sans redessiner ni contrefaire son nom.
- **Couleur propriétaire** : indigo StockKonect (#6857E8), associé à des surfaces ivoire distinctives.

## Architecture
- `src/app/page.tsx` : landing page publique, démonstration visuelle d’interface, sections fonctionnalités/vidéo/tarifs/FAQ et CTA.
- `src/app/globals.css` : tokens et styles transversaux spécifiques à la landing page, en préservant les utilitaires Tailwind nécessaires à l’application.
- `src/app/layout.tsx` : métadonnées et langue déjà en place ; à ajuster seulement si nécessaire.
- `public/` : réutiliser logos et vidéo publicitaire existants. Les icônes sont dessinées en SVG via `lucide-react` déjà installé.

## Contrainte de contenu
Les offres publiques sont Starter (9 900 F CFA/mois, 50 produits, 2 utilisateurs), Pro (14 900 F CFA/mois, 200 produits, 5 utilisateurs) et Business (24 900 F CFA/mois, 500 produits, 10 utilisateurs). L’essai dure 7 jours. Le paiement après l’essai est accompagné manuellement par WhatsApp. Le compte démo est en lecture seule et l’accès se fait sur appareil connecté à Internet.
