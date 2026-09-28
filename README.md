# Stockkonect — SaaS de gestion de stock

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
- **Assistance** : contact **WhatsApp** (sidebar, landing et footer) + guide d'utilisation PDF intégré (`/guide-stockkonect.pdf`)

## Démarrage rapide

L'application utilise **PostgreSQL** (Neon, Supabase, Railway…) via Prisma.

```bash
npm install
# configurez DATABASE_URL et AUTH_SECRET dans .env (voir .env.example)
npx prisma migrate dev      # crée les tables
npm run db:seed             # données de démo (optionnel)
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

**Comptes de démo** :

| Compte | Email | Mot de passe | Rôle |
|---|---|---|---|
| Entreprise démo | `demo@stockkonect.fr` | `demo1234` | Admin de « Demo SAS » |
| Plateforme | `admin@stockkonect.fr` | `super1234` | Super-Admin (console `/admin`)|

## Rôles & multi-entreprises (SaaS)

- **Employé (STAFF)** : accès aux opérations quotidiennes — produits, mouvements, ventes, approvisionnements, clients, exports.
- **Administrateur (ADMIN)** : tout l'app + gestion des **Utilisateurs** de son entreprise (inviter, changer le rôle, réinitialiser le mot de passe, supprimer) + **Paramètres** de l'organisation.
- **Super-Admin (SUPER_ADMIN)** : compte **plateforme**, sans entreprise. Console `/admin` : liste de toutes les entreprises inscrites avec leurs statistiques (utilisateurs, produits, ventes), et **suspension/réactivation** d'une entreprise (bloque instantanément toutes les sessions de ses utilisateurs, refus de connexion).

Le cloisonnement des données est assuré partout par `organizationId` : chaque requête API filtre sur l'entreprise de l'utilisateur connecté. Le plan **Gratuit** limite à 2 utilisateurs par entreprise (le plan Pro lève la limite, champ `maxUsers`).

## Variables d'environnement

Copiez `.env.example` vers `.env` :

- `DATABASE_URL` — chaîne de connexion **PostgreSQL** (Neon : `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`)
- `AUTH_SECRET` — secret de signature des sessions JWT (**obligatoire**, à changer en production)

## Déploiement Vercel

1. Poussez le code sur GitHub (fait) — le dépôt est déjà connecté à Vercel (`stockkonnect.vercel.app`)
2. Dans **Vercel → votre projet → Settings → Environment Variables**, ajoutez :
   - `DATABASE_URL` : votre chaîne Neon/Supabase (utilisez la **pooled connection** Neon pour de meilleures perfs serverless)
   - `AUTH_SECRET` : une chaîne aléatoire (`openssl rand -base64 32`)
3. **Redeploy** (les variables ne s'appliquent qu'aux nouveaux déploiements)
4. Créez les tables : en local avec le même `DATABASE_URL` dans `.env`, lancez `npx prisma migrate deploy`
5. (Optionnel) données de démo : `npm run db:seed` avec la même URL

> ⚠️ Sur Vercel, le système de fichiers est en lecture seule : l'upload d'images renvoie des **data URLs** stockées en base. Pour de gros volumes, passez à un stockage objet (S3, Cloudinary).

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

- Changer `AUTH_SECRET` (cookie `secure` automatique en HTTPS)
- Les images uploadées sont stockées en data URL en base (ou passez à S3/Cloudinary)
- Neon gratuit convient jusqu'à ~0,5 Go ; surveillez la taille si les photos produits s'accumulent
