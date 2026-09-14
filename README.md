# StockFlow — SaaS de gestion de stock

Application web multi-entreprises de gestion de stock construite avec **Next.js 15**, **TypeScript**, **Prisma** (SQLite) et **Tailwind CSS**. Interface entièrement en français.

## Fonctionnalités

- **Multi-tenant** : chaque entreprise dispose de ses données isolées (organisation + utilisateurs)
- **Authentification** : inscription, connexion, sessions JWT (cookie httpOnly)
- **Produits** : SKU, code-barres, photo, prix de vente/coût, seuil d'alerte, catégorie, fournisseur
- **Mouvements de stock** : entrées, sorties, ajustements (stock mis à jour atomiquement)
- **Ventes** : panier multi-articles, décrément du stock, annulation avec restauration
- **Approvisionnements** : réception multi-articles, incrément du stock, annulation
- **Clients & Fournisseurs** : répertoires CRUD
- **Catégories** : organisation des produits
- **Tableau de bord** : valeur du stock, CA du mois, achats du mois, graphiques 14 jours + répartition, alertes stock bas
- **Étiquettes code-barres** : impression (Code 128)
- **Paramètres** : devise, seuil d'alerte global

## Démarrage rapide

```bash
npm install
npx prisma migrate dev      # crée la base SQLite
npm run db:seed             # données de démo (optionnel)
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

**Comptes de démo** :

| Compte | Email | Mot de passe | Rôle |
|---|---|---|---|
| Entreprise démo | `demo@stockflow.fr` | `demo1234` | Admin de « Demo SAS » |
| Plateforme | `admin@stockflow.fr` | `super1234` | Super-Admin (console `/admin`)|

## Rôles & multi-entreprises (SaaS)

- **Employé (STAFF)** : accès aux opérations quotidiennes — produits, mouvements, ventes, approvisionnements, clients, exports.
- **Administrateur (ADMIN)** : tout l'app + gestion des **Utilisateurs** de son entreprise (inviter, changer le rôle, réinitialiser le mot de passe, supprimer) + **Paramètres** de l'organisation.
- **Super-Admin (SUPER_ADMIN)** : compte **plateforme**, sans entreprise. Console `/admin` : liste de toutes les entreprises inscrites avec leurs statistiques (utilisateurs, produits, ventes), et **suspension/réactivation** d'une entreprise (bloque instantanément toutes les sessions de ses utilisateurs, refus de connexion).

Le cloisonnement des données est assuré partout par `organizationId` : chaque requête API filtre sur l'entreprise de l'utilisateur connecté. Le plan **Gratuit** limite à 2 utilisateurs par entreprise (le plan Pro lève la limite, champ `maxUsers`).

## Variables d'environnement

Copiez `.env.example` vers `.env` :

- `DATABASE_URL` — chemin de la base SQLite (`file:./dev.db`)
- `AUTH_SECRET` — secret de signature des sessions JWT (**à changer en production**)

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Serveur de production |
| `npm run lint` | ESLint |
| `npm run db:seed` | Insère les données de démo |
| `npx prisma studio` | Explorateur de base de données |

## Structure

```
src/
├── app/
│   ├── (app)/           # Espace authentifié (dashboard, produits, ventes…)
│   ├── api/             # API REST (auth, produits, mouvements, ventes…)
│   ├── login/ register/ # Pages publiques
│   └── page.tsx         # Landing page
├── components/          # UI partagée (modales, CRUD générique, sidebar)
├── lib/                 # db (Prisma), auth, jwt
└── middleware.ts        # Protection des routes
prisma/
├── schema.prisma        # Modèles (Organization, Product, Sale…)
└── seed.ts              # Données de démo
```

## Notes de production

- Changer `AUTH_SECRET` et utiliser une base PostgreSQL/MySQL (changer le `provider` dans `schema.prisma`)
- Les images uploadées vont dans `public/uploads` (préférer un stockage objet type S3 en production)
- Ajouter HTTPS (cookies `secure` automatiquement en production)
