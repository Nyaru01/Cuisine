# À Table !

Une PWA familiale qui compose neuf repas par semaine, adapte les ingrédients au foyer et prépare la liste de courses. Interface en français, conçue pour le téléphone et pour l’impression sur PC.

## Fonctionnement

- Lundi à vendredi : dîner. Samedi et dimanche : déjeuner et dîner.
- Génération par score : mois/saison de chaque repas, historique à 28 jours, préférences, favoris, préparation en semaine, diversité des protéines/féculents et succession des plats lourds.
- Remplacement avec trois alternatives ou « Surprends-moi ». Un seul créneau change ; un créneau verrouillé est protégé par l’API.
- Catalogue de 60 recettes rédigées et embarquées, avec ingrédients, quantités pour quatre adultes, étapes et allergènes. Le nombre exact est affiché dans l’application et par le seed.
- Foyer initial : deux adultes et un enfant de cinq ans, soit 2,5 portions adultes. Les coefficients culinaires sont centralisés dans `shared/domain.ts` : moins de 3 ans → 0,35 ; 3–6 → 0,5 ; 7–11 → 0,7 ; 12+ → 1. Les réglages modifient la composition et recalculent les courses actuelles/futures.
- Courses par rayon, unités normalisées, cases conservées tant que la quantité reste identique. Une quantité modifiée est remise à cocher.
- Favoris, recherche par plat/ingrédient, filtres saison/rapidité/végétarien/compatibilité, historique des semaines passées et fréquence des recettes planifiées.
- Impression A4 dédiée pour le menu et les courses.

## Architecture

`src/` : React 19, TypeScript strict, Vite, React Router, TanStack Query, Lucide. CSS personnalisé pour l’identité visuelle et animations courtes respectant les préférences de mouvement réduit. Les pages secondaires sont chargées à la demande.

`shared/` : types, catalogue, dates Europe/Paris, portions, agrégation des courses et algorithme ; partagé entre le serveur et les tests.

`server/` : Express 5, validation Zod, gestion centralisée des erreurs, sessions signées en cookie HttpOnly, protection des écritures contre les requêtes intersites et limitation des tentatives de connexion.

`prisma/` : PostgreSQL, relations SQL foyer/enfants/réglages/exclusions/recettes/ingrédients/plans/repas/favoris/historique/courses, migration SQL versionnée et seed idempotent. Les tableaux de métadonnées des recettes utilisent des tableaux PostgreSQL ; les données métier ne sont pas un document JSON global.

Le verrou transactionnel du foyer et la version d’une semaine protègent les modifications simultanées. Une édition basée sur une ancienne version reçoit HTTP 409 et actualise l’interface. PostgreSQL est la source de vérité. Les pages consultées sont mises en cache localement pour la lecture hors connexion ; les écritures exigent une connexion. La synchronisation s’effectue toutes les 15 secondes et au retour sur l’application, sans websocket. Le premier chargement regroupe les données nécessaires dans une requête protégée `/api/bootstrap`. Les réponses et les assets sont compressés ; les fichiers portant un hash sont conservés en cache long.

Les quantités en pièces et tranches sont arrondies à l’unité supérieure dans la fonction de portions : pas de demi-œuf à casser ni de citron fractionnaire à acheter. Les poids et volumes restent calculés proportionnellement.

## Installation locale

Prérequis : Node.js 22.12+ (24 conseillé), npm, PostgreSQL. Windows, macOS ou Linux.

```powershell
npm install
Copy-Item .env.example .env
```

Pour développer sans installer un service PostgreSQL système, dans un premier terminal :

```powershell
npm run db:local
```

Ce script démarre un vrai PostgreSQL lié uniquement à `127.0.0.1:55432`, conserve ses données dans `.local/postgres` et s’arrête avec Ctrl+C. Il ne modifie aucun service système. Ses identifiants `cuisine/cuisine` sont réservés au développement local. Il télécharge des binaires propres à la plateforme via `embedded-postgres` si nécessaire.

Dans un second terminal :

```powershell
npm run db:migrate
npm run db:seed
npm run dev
```

Ouvrir `http://127.0.0.1:5173`. Vite transmet `/api` au serveur local sur le port 3001. Ne lancez pas deux instances de la base locale avec le même port/dossier.

Avec une base PostgreSQL existante, renseigner sa connexion dans `DATABASE_URL` et omettre `db:local`.

## Variables d’environnement

| Variable          | Usage                                                               |
| ----------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`    | Connexion PostgreSQL Prisma, obligatoire                            |
| `PORT`            | Port d’écoute de l’API, fourni par Railway, 3001 en local           |
| `NODE_ENV`        | `production` sur Railway                                            |
| `FAMILY_PASSWORD` | Mot de passe commun au foyer, minimum 12 caractères en production   |
| `SESSION_SECRET`  | Secret de signature, minimum 32 caractères aléatoires en production |

Créer le secret, par exemple avec `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Le conserver dans les variables Railway, jamais dans Git. La production refuse de démarrer sans protection du foyer. En local, un `FAMILY_PASSWORD` vide permet l’accès sur la boucle locale sans connexion. Si vous protégez le développement local, fournissez aussi un secret stable.

Chaque appareil se connecte avec le mot de passe du foyer ; le cookie signé expire après 30 jours. Les cookies sont `Secure` en production et `SameSite=Strict`. Changer `SESSION_SECRET` invalide toutes les sessions existantes. Fermer la session efface le cache de cet appareil. Une session fermée côté serveur ne supprime pas à distance les données hors connexion déjà conservées sur un autre appareil.

## Prisma et recettes

```powershell
npx prisma migrate deploy
npx prisma db seed
```

Le seed met à jour les recettes et leurs ingrédients, mais préserve le foyer, ses réglages, ses favoris, ses semaines et ses cases de courses. Réexécuter le seed après modification du catalogue. Les illustrations SVG locales sont des visuels de catégorie, pas des photographies de chaque recette. Le champ `Recipe.image` permet de les remplacer individuellement. Les icônes PNG et les illustrations sont versionnées ; `node scripts/assets.mjs` les régénère.

## Vérification et production locale

```powershell
npm run typecheck
npm run lint
npm test
npm run test:api
npm run build
npm start
```

`test:api` utilise un schéma PostgreSQL temporaire `qa_<timestamp>` sur la connexion de `.env`, le migre, le peuple puis le supprime. Il ne modifie pas le schéma applicatif. À lancer sur une base locale de développement avec les droits de création/suppression de schéma.

Avec l’application construite et démarrée sur le port 3001 :

```powershell
npx playwright install chromium
npm run test:ui
```

Les tests UI sont destinés à la base de développement locale, sans mot de passe : ils génèrent des menus, modifient des repas/favoris/cases de courses. Ils contrôlent les parcours, les sept largeurs du cahier des charges, les images, les erreurs JavaScript, le service worker, le rechargement hors connexion et produisent des PDFs A4 dans `.local/qa`. `APP_URL` permet un autre port local. Le rapport HTML est dans `playwright-report`.

## Déploiement Railway

Instance publiée : [À Table !](https://cuisine-production-9ac9.up.railway.app). Projet `Cuisine`, environnement `production`, services `Cuisine` et `Postgres`. La branche GitHub `main` déclenche les déploiements. Les accès sont conservés localement dans `.local/production-access.json`, exclu de Git ; utiliser uniquement `FAMILY_PASSWORD` pour se connecter.

1. Créer un projet Railway et ajouter un service PostgreSQL.
2. Ajouter un service depuis `Nyaru01/Cuisine`, branche `main`, racine du repository.
3. Renseigner `DATABASE_URL` par la référence `${{Postgres.DATABASE_URL}}` (adapter au nom exact du service PostgreSQL).
4. Ajouter `NODE_ENV=production`, `FAMILY_PASSWORD` et `SESSION_SECRET`. Railway fournit `PORT`. Railpack installe les dépendances puis lance `npm run build` : ne pas réinstaller les dépendances dans la commande de build. `RAILPACK_NODE_NPM_INSTALL=npm ci --include=dev` est configuré pour l’installation.
5. Dans les réglages du service, configurer **Pre-deploy Command** : `npm run db:migrate && npm run db:seed`, et **Healthcheck Path** : `/api/health`. La commande de démarrage détectée est `npm start`. Le healthcheck vérifie les tables, le catalogue et le foyer initialisé. Ces réglages sont indispensables : les nouveaux services Railway ignorent désormais `railway.json`. Ce fichier reste une référence pour les services utilisant encore l’ancien mode ; la configuration effective de Cuisine est dans Railway.
6. Générer un domaine HTTPS Railway. Le frontend et l’API ont la même origine.
7. Vérifier la connexion du foyer depuis deux appareils, les courses et l’installation PWA.

Références de configuration : [Railway Infrastructure as Code](https://docs.railway.com/infrastructure-as-code), [ancien mode Config as Code](https://docs.railway.com/config-as-code/reference), [healthchecks Railway](https://docs.railway.com/deployments/healthchecks), [migration Prisma 6](https://www.prisma.io/docs/orm/v6/prisma-client/deployment/deploy-migrations-from-a-local-environment).

## PWA et utilisation hors connexion

`vite-plugin-pwa` produit `manifest.webmanifest` et un service worker Workbox. Les pages et illustrations locales sont précachées. Les réponses privées de l’API ne sont pas mises dans le cache HTTP du service worker ; le client conserve les dernières données GET consultées pour la lecture hors connexion. Les pages non consultées et les semaines non chargées nécessitent une connexion. Les nouvelles versions proposent un bouton « Actualiser ».

Android/desktop : installation via le navigateur compatible. iPhone/iPad : Safari → Partager → Sur l’écran d’accueil. L’installation nécessite HTTPS, sauf sur localhost. Le service worker n’est activé que dans la version construite (`npm run build`, `npm start`), pas pendant `npm run dev`.

## Périmètre de la V1

Un foyer partagé, sans compte individuel ni multi-tenant. Les écrans exposent uniquement le foyer configuré côté serveur. Les relations SQL possèdent un `householdId` pour une évolution ultérieure. Les repas de l’historique sont ceux planifiés, sans confirmation qu’ils ont effectivement été consommés. L’équilibre est une règle de variété culinaire, sans calcul nutritionnel. Les allergies de base sont issues des ingrédients ; les traces, les substitutions et la composition des produits achetés restent à vérifier.

Les objectifs Lighthouse doivent être mesurés sur le domaine de production. Les installations sur appareils physiques restent à vérifier sur le téléphone du foyer.
