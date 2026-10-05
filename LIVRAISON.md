# À Table ! — Première livraison

Validation du 5 octobre 2026. Application publiée sur [À Table !](https://cuisine-production-9ac9.up.railway.app), avec PostgreSQL persistant sur Railway. La version locale reste disponible sur `http://127.0.0.1:3001`, avec PostgreSQL local sur `127.0.0.1:55432`.

## Plan réalisé

| Étape | Résultat |
| --- | --- |
| Architecture et persistance | React/TypeScript, API Express, PostgreSQL/Prisma, migration SQL et relations métier |
| Catalogue | 60 recettes complètes, ingrédients pour 4 portions, étapes spécifiques, saisons/mois, allergènes, illustrations locales |
| Planning | 9 créneaux, semaines du lundi au dimanche, dates en français et Europe/Paris |
| Génération | Score saison/mois, diversité, historique, préparation en semaine, compatibilité enfant, exclusions et favoris |
| Remplacement | 3 propositions et remplacement immédiat ; les 8 autres créneaux restent inchangés |
| Verrouillage | Conservé à la régénération ; l’API refuse un changement de repas verrouillé |
| Portions | 2 adultes + enfant de 5 ans = 2,5 portions adultes ; composition réglable, pièces entières arrondies |
| Courses | Agrégation par ingrédient/unité, conversions, rayons, cases persistées en base, recalcul après changement |
| Synchronisation | Deux sessions lisent le même état PostgreSQL ; actualisation toutes les 15 secondes et au retour sur la page |
| Concurrence | Verrou transactionnel et version du planning ; une édition obsolète reçoit HTTP 409 |
| Recettes et préférences | Fiches, étapes à cocher, recherche, filtres, favoris, historique, goûts et allergies séparés |
| Mobile et desktop | Navigation adaptée, focus clavier, dialogues natifs, mouvements réduits, aucun débordement testé |
| Impression | Aperçus dédiés menu/courses, CSS A4, navigation masquée ; les deux exemples contrôlés tiennent sur une page |
| PWA | Manifest, icônes PNG, service worker, cache des assets, lecture des données consultées hors connexion |
| Authentification | Mot de passe du foyer, cookie signé HttpOnly/Secure en production, contrôle d’origine, limitation des tentatives |
| Production | Build React de production, compression HTTP, cache des assets portant un hash, santé PostgreSQL |
| Railway | Projet Cuisine en production, domaine HTTPS, PostgreSQL persistant, migration et seed avant déploiement, publication automatique depuis GitHub main |

## Vérifications exécutées

- `npm install` : terminé, lockfile versionné.
- `npm run typecheck` : réussi, frontend et backend stricts.
- `npm run lint` : réussi.
- `npm run build` : réussi ; frontend, serveur et PWA générés.
- `npm test` : 10 tests métier réussis, dont 360 générations sur les 12 mois.
- `npm run test:api` : scénario d’intégration réussi dans un schéma PostgreSQL temporaire isolé. Authentification, bootstrap privé, génération, verrouillage, remplacement individuel, favoris, paramètres, courses, deux sessions et conflit concurrent vérifiés.
- `npm run test:ui` : 5 tests Playwright réussis. Parcours utilisateur complet, fuseau différent, responsive, impression et rechargement hors connexion.
- Responsive : 360, 390, 430, 768, 1024, 1440 et 1920 px, sur Semaine, Courses, Recettes, Favoris, Réglages et Historique. Aucun débordement horizontal ni image cassée, aucune erreur JavaScript capturée.
- Impression : PDFs Chromium A4, nombre de pages contrôlé, rendus PNG inspectés visuellement. Menu et courses : 1 page chacun pour le planning de validation.
- Migrations et seed relancés : aucune migration en attente, 60 recettes conservées, foyer et planning préservés.
- `npm audit` : aucune vulnérabilité signalée, dépendances de développement comprises.

## Mesure Lighthouse

Audit mobile simulé sur le build de production servi localement, après amélioration du premier chargement et des contrastes :

| Catégorie | Score |
| --- | --- |
| Performance | 94 |
| Accessibilité | 100 |
| Bonnes pratiques | 100 |

LCP : 2,3 s. TBT : 180 ms. CLS : 0. Ces chiffres sont une mesure locale, pas une garantie du futur hébergement Railway.

Les captures, PDFs, rendus et rapports bruts sont dans `.local/qa` ; le rapport Playwright est dans `playwright-report`. Ces fichiers de contrôle et les données PostgreSQL sont exclus de Git. Le README contient les commandes pour les reproduire.

## Vérification de production

- Code publié sur `Nyaru01/Cuisine`, branche `main`, reliée au service Railway `Cuisine` ; PostgreSQL et application déployés avec succès.
- Migration SQL appliquée et seed idempotent exécuté : 60 recettes disponibles. Neuf repas distincts initialisés pour la semaine du 5 octobre ; liste de 36 ingrédients agrégés.
- Domaine HTTPS : santé HTTP 200 ; catalogue protégé HTTP 401 sans session ; bootstrap anonyme sans données privées.
- Connexion avec le mot de passe du foyer : cookie HttpOnly/Secure/SameSite=Strict ; deux sessions indépendantes lisent le même planning. Une case de courses modifiée par une session est visible dans l’autre, puis remise à son état initial.
- Trois alternatives disponibles pour un repas ; écritures sans header de protection refusées HTTP 403 ; page, manifest, service worker et illustration vérifiés HTTP 200.
- Rapport sans secrets dans `.local/qa/production-checks.json`. Accès du foyer dans `.local/production-access.json`, exclu de Git. Seul `FAMILY_PASSWORD` est nécessaire dans le formulaire de connexion.
- Adaptation au nouveau fonctionnement Railway : `railway.json` est ignoré par ce nouveau service. La commande de pré-déploiement et le healthcheck sont configurés directement dans le service ; le README détaille leur reproduction. Le healthcheck applicatif vérifie aussi que les tables, le catalogue et le foyer existent.

## À valider sur les appareils physiques

- Installation réelle iOS/Android/desktop et synchronisation téléphone/PC via le domaine Railway : manifest, worker et scénario navigateur validés localement, appareils physiques non testés.
- Impression papier avec l’imprimante du foyer : PDFs A4 contrôlés, impression matérielle non exécutée. Une liste plus longue peut occuper plusieurs pages sans couper ses catégories.

## Choix de V1

Illustrations SVG de catégorie plutôt que photos distantes ; les recettes peuvent recevoir une image individuelle. Animations CSS courtes, sans dépendance Framer Motion. CSS personnalisé, sans Tailwind. Lecture hors connexion des données déjà consultées, écritures à la reconnexion ; aucune file de modifications hors ligne. Un foyer partagé, sans comptes individuels. Historique des repas planifiés, sans confirmation de consommation. Le modèle de variété et les coefficients de portions sont culinaires, sans calcul nutritionnel.
