# À Table ! — Première livraison

Validation du 5 octobre 2026. Application construite et démarrée sur `http://127.0.0.1:3001`, avec PostgreSQL local persistant sur `127.0.0.1:55432`.

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
| Railway | Configuration de build/démarrage, migration et seed avant déploiement, variables documentées |

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

## À valider sur l’hébergement et les appareils physiques

- Publication et vérification du domaine HTTPS Railway : la session CLI présente a expiré (`Unauthorized. Please run railway login again.`) et aucun projet n’est lié. Aucun déploiement public n’a été effectué.
- Le repository distant était vide lors de l’inspection. Les commits sont préparés localement sur `main` ; aucune publication GitHub n’a été effectuée.
- Installation réelle iOS/Android/desktop et synchronisation téléphone/PC via le domaine Railway : manifest, worker et scénario navigateur validés localement, appareils physiques non testés.
- Impression papier avec l’imprimante du foyer : PDFs A4 contrôlés, impression matérielle non exécutée. Une liste plus longue peut occuper plusieurs pages sans couper ses catégories.

## Choix de V1

Illustrations SVG de catégorie plutôt que photos distantes ; les recettes peuvent recevoir une image individuelle. Animations CSS courtes, sans dépendance Framer Motion. CSS personnalisé, sans Tailwind. Lecture hors connexion des données déjà consultées, écritures à la reconnexion ; aucune file de modifications hors ligne. Un foyer partagé, sans comptes individuels. Historique des repas planifiés, sans confirmation de consommation. Le modèle de variété et les coefficients de portions sont culinaires, sans calcul nutritionnel.
