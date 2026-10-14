# Recette technique pré-client — StockKonect

**Date :** 14 octobre 2026  
**Cible de production vérifiée :** <https://stockkonnect.vercel.app/>  
**Dépôt :** <https://github.com/kingdavei-afk/stockkonnect>

## Verdict

**Le défaut de la page Tarifs est corrigé et vérifié en production.** Les parcours métier de base sont validés sur une base PostgreSQL jetable, mais StockKonect n’est pas encore prêt pour l’ouverture commerciale : la vidéo reste bloquée sur la production actuelle et l’audit conserve des vulnérabilités.

1. Le smoke test production reste à **7/10** : affiche vidéo 404 et formats MP4/WebM redirigés vers Connexion.
2. L’audit des dépendances de production conserve **5 avis non résolus — 4 High et 1 Moderate**.

Le hotfix minimal [PR #3](https://github.com/kingdavei-afk/stockkonnect/pull/3) a été fusionné sur `main` et déployé. Il ajoute uniquement `/plans` à la liste des routes publiques. **Aucune donnée métier ou de production n’a été modifiée.** Les PR de redesign et de tests restent séparés.

## Résultats exécutés

| Contrôle | Résultat | Détail |
|---|---:|---|
| Smoke test de production avant hotfix | **6/10** | Échecs ciblés sur `/plans`, l’affiche vidéo et les deux formats vidéo. |
| Smoke test de production après hotfix | **7/10** | `/plans` répond 200 et le HTML contient Starter, Pro et Business ; seuls les contrôles vidéo échouent. |
| Connexion au compte démo et tableau de bord production | **4/4** | Accueil, guide PDF, connexion démo et `/dashboard` répondent en HTTP 200. La connexion n’a créé aucune donnée métier. |
| Smoke test de la branche corrigée en local | **10/10** | Pages publiques, affiche et vidéos accessibles ; dashboard redirigé sans session ; API produits renvoie 401 sans session. |
| Tests unitaires | **7/7** | Sessions JWT, jetons webhook, plans, lecture seule du compte démo, références organisationnelles. |
| Tests d’intégration HTTP/PostgreSQL | **48 assertions réussies** | Inscription, sessions HttpOnly/SameSite, unicité SKU, isolation entre deux organisations, ventes, annulations, approvisionnements, stock insuffisant, quota du forfait gratuit et blocage des écritures de démo. |
| Build Next.js production | **Réussi** | Génération et compilation des 42 routes statiques ; routes applicatives compilées. |
| TypeScript (`npx tsc --noEmit`) | **Réussi** | Aucune erreur. |
| ESLint | **Réussi, avec avertissements** | 0 erreur, 11 avertissements préexistants (imports/variables inutilisés et un `<img>` non optimisé). |
| Validation Prisma | **Réussie** | Le schéma est valide. Avertissement distinct : la configuration `package.json#prisma` est dépréciée pour Prisma 7. |

### Défauts observés avant le hotfix et état actuel

- `GET /plans` → **307 vers `/login`** avant le hotfix ; **corrigé** : depuis le déploiement du PR #3, la requête anonyme répond **200** et le contenu inclut les offres Starter, Pro et Business.
- L’affiche `video-stockkonect-poster.jpg` → **404** : l’asset ajouté à la branche de redesign n’est pas encore déployé.
- `video-publicitaire-stockkonect.mp4` et `.webm` → **307 vers `/login`** : les assets sont traités comme des routes privées.

La branche de redesign autorise déjà les formats vidéo et ajoute l’affiche ; ces routes passent en **10/10 en local**, mais le redesign reste à fusionner/déployer pour corriger le comportement vidéo en production.

## Couverture d’intégration réalisée

Les tests métier ont été exécutés après migrations et seed sur une base PostgreSQL locale nommée `stockkonnect_test` — jamais sur la base de production. Ils vérifient notamment :

- les inscriptions valides/invalides et le rejet d’un email dupliqué ;
- les cookies de session (`HttpOnly`, `SameSite=Lax`) et le refus d’accès API sans session ;
- le cloisonnement : une organisation ne liste ni ne modifie le produit d’une autre ;
- la création de produit, le rejet d’un SKU en double et le plafond de 10 produits du forfait gratuit ;
- la décrémentation du stock lors d’une vente, le refus d’une vente excessive, la restauration lors de l’annulation et l’idempotence de cette annulation ;
- l’incrémentation lors d’un approvisionnement, puis la reprise du stock lors de son annulation ;
- le refus d’une sortie de stock excessive sans altérer le stock ;
- le refus des écritures depuis le compte démo, sans variation des données de démonstration.

Les tests d’intégration démarrent eux-mêmes une instance locale de l’application et **refusent toute base ou hôte non local**. Ils créent des comptes et produits synthétiques dans la base portant `test` dans son nom. Utiliser uniquement une base jetable.

## Dépendances et sécurité

L’audit initial signalait 7 avis dans les dépendances de production. Les mises à jour automatiques **sans `--force`** ont réduit ce nombre à **5** : quatre High et un Moderate. Les éléments restants touchent notamment Prisma/`deepmerge-ts`, Next.js et PostCSS.

NPM ne propose que des changements non triviaux pour les corriger : `prisma@6.12.0` (retour arrière depuis Prisma 6.19.x) ou `next@16.4.0` (migration majeure). Aucun de ces changements n’a été appliqué automatiquement. **Ne pas lancer `npm audit fix --force` sans tester une migration de versions.** Un passage à Next 16 et un plan de mise à niveau Prisma doivent être étudiés avant d’exposer les données de clients.

## Ce qui reste à tester en staging avant ouverture commerciale

- Après déploiement de la refonte PR #1, rejouer le smoke test production et confirmer **10/10**, y compris les médias vidéo.
- Tester les paiements uniquement avec un compte et des clés **CinetPay sandbox**, y compris callback/webhook, statut, montant, idempotence et échec réseau. Aucun paiement réel n’a été initié.
- Vérifier sauvegarde/restauration, invitations et permissions des différents rôles, concurrence lors de deux ventes simultanées, et parcours d’inscription sur mobile avec un jeu de données de staging.
- Traiter les vulnérabilités npm et refaire `npm audit --omit=dev` après les changements retenus.
- Refaire une recette complète après tout changement de dépendance ou de schéma.

## Commandes de test ajoutées

- `npm test` — tests unitaires sans base.
- `npm run test:smoke` — requêtes GET/HEAD en lecture seule ; `BASE=https://stockkonnect.vercel.app npm run test:smoke` pour tester un déploiement, sans connexion et sans mutation métier.
- `npm run test:integration` — tests locaux de bout en bout ; nécessite une build récente, les migrations/seed sur une base PostgreSQL locale dédiée `*_test`, et `DATABASE_URL` correspondant à cette base.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — vérifications de code/build.
