# Projet : PWA familiale de gestion des repas

Développe une application web moderne sous forme de **PWA responsive**, destinée à organiser automatiquement les repas d'une famille.

Repository GitHub :

`https://github.com/Nyaru01/Cuisine`

Le repository est initialement vide.

L'application sera déployée sur **Railway**, directement depuis la branche `main` du repository GitHub.

L'objectif est d'obtenir une vraie application utilisable quotidiennement sur :

- smartphone Android/iPhone ;
- tablette ;
- ordinateur ;
- écran desktop pour consultation et impression.

L'application doit être extrêmement agréable visuellement, rapide, simple à utiliser et pensée **mobile-first**, tout en offrant une vraie interface desktop.

---

# 1. Famille concernée

Le foyer est composé de :

- 2 adultes ;
- 1 enfant de 5 ans.

Les quantités des recettes doivent être adaptées automatiquement à cette composition familiale.

Ne pas simplement considérer 3 portions adultes.

Prévoir dans le modèle de données :

```ts
household = {
  adults: 2,
  children: [
    {
      age: 5
    }
  ]
}
```

La composition doit être modifiable ultérieurement depuis les paramètres.

---

# 2. Organisation hebdomadaire des repas

L'application doit gérer automatiquement une semaine complète.

## Du lundi au vendredi

Prévoir uniquement :

- dîner.

## Samedi et dimanche

Prévoir :

- déjeuner ;
- dîner.

Une semaine standard contient donc :

- lundi soir ;
- mardi soir ;
- mercredi soir ;
- jeudi soir ;
- vendredi soir ;
- samedi midi ;
- samedi soir ;
- dimanche midi ;
- dimanche soir.

Soit **9 repas par semaine**.

L'utilisateur doit pouvoir naviguer entre :

- semaine précédente ;
- semaine actuelle ;
- semaine suivante.

La semaine actuelle doit être immédiatement identifiable.

---

# 3. Génération automatique des menus

L'application doit être capable de générer automatiquement les 9 repas de la semaine.

Ajouter un bouton principal :

**Générer ma semaine**

L'algorithme doit tenir compte :

- de la saison ;
- du mois courant ;
- des ingrédients de saison disponibles en France ;
- de la diversité des repas ;
- du temps de préparation ;
- du fait qu'un enfant de 5 ans mange avec les adultes ;
- de l'équilibre alimentaire global ;
- des recettes utilisées récemment.

Éviter par exemple une semaine contenant :

- 3 plats de pâtes ;
- 3 plats à base de poulet ;
- plusieurs gratins consécutifs ;
- plusieurs repas très lourds successifs.

La génération doit donner l'impression d'un menu familial cohérent, pas d'un simple tirage aléatoire.

---

# 4. Remplacement individuel d'un repas

Fonction extrêmement importante.

Chaque repas doit comporter un bouton :

**Changer**

Cliquer dessus ne doit PAS régénérer la semaine entière.

L'application propose plusieurs recettes alternatives, par exemple :

- 3 propositions alternatives ;
- adaptées à la saison ;
- différentes du repas actuel ;
- différentes des autres repas de la semaine.

Afficher les alternatives sous forme de jolies cartes.

L'utilisateur sélectionne celle qu'il préfère.

Le reste du planning reste exactement identique.

Prévoir également :

**Surprends-moi**

pour remplacer immédiatement la recette par une autre recette compatible.

---

# 5. Verrouillage des repas

Ajouter la possibilité de verrouiller un repas.

Icône :

🔒

Un repas verrouillé ne doit jamais être remplacé lors d'une nouvelle génération partielle ou complète.

Exemple :

L'utilisateur adore le repas du mercredi.

Il le verrouille.

Il clique ensuite sur :

**Régénérer la semaine**

Le mercredi reste inchangé.

---

# 6. Recettes

L'application doit contenir **au minimum 50 vraies recettes dès la première version**.

Ne jamais utiliser :

- "Recette 1" ;
- "Plat exemple" ;
- données fictives ;
- lorem ipsum.

Créer de vraies recettes familiales françaises ou couramment consommées en France.

Prévoir une bonne diversité.

Exemples de catégories :

- cuisine française ;
- cuisine italienne ;
- cuisine méditerranéenne ;
- plats asiatiques simples ;
- plats végétariens ;
- poulet ;
- bœuf ;
- porc ;
- poisson ;
- pâtes ;
- riz ;
- légumes ;
- soupes ;
- gratins ;
- plats mijotés ;
- repas rapides ;
- repas du dimanche.

Inclure des plats simples adaptés au quotidien comme :

- hachis parmentier ;
- poulet rôti ;
- gratin dauphinois ;
- lasagnes ;
- spaghetti bolognaise ;
- quiche lorraine ;
- saumon au four ;
- curry de poulet ;
- risotto ;
- croque-monsieur ;
- soupe de légumes ;
- tartiflette ;
- blanquette de veau ;
- chili con carne ;
- poisson en papillote ;
- poulet basquaise ;
- gratins de légumes ;
- etc.

Ne pas limiter les recettes à cette liste.

---

# 7. Structure d'une recette

Chaque recette doit disposer au minimum de :

```ts
Recipe {
  id
  name
  description
  image
  preparationTime
  cookingTime
  totalTime

  difficulty

  ingredients[]

  instructions[]

  categories[]

  seasons[]

  months[]

  allergens[]

  childFriendly

  vegetarian

  servings

  createdAt
  updatedAt
}
```

Pour les ingrédients :

```ts
Ingredient {
  name
  quantity
  unit
  category
}
```

Exemple :

```json
{
  "name": "Carottes",
  "quantity": 500,
  "unit": "g",
  "category": "Légumes"
}
```

---

# 8. Fiche recette

Lorsqu'on ouvre un repas, afficher une vraie fiche recette.

Elle doit montrer clairement :

- belle photo ;
- nom ;
- description courte ;
- temps de préparation ;
- temps de cuisson ;
- durée totale ;
- difficulté ;
- ingrédients ;
- quantités ;
- nombre de personnes ;
- étapes de préparation.

Les étapes doivent être numérotées et faciles à suivre depuis un smartphone posé dans une cuisine.

Prévoir des cases ou états permettant éventuellement de suivre les étapes.

---

# 9. Portions

Les quantités doivent être calculées pour :

**2 adultes + 1 enfant de 5 ans**

Prévoir une fonction centralisée permettant d'adapter les portions.

Ne pas hardcoder les quantités directement dans les composants UI.

Les recettes peuvent être stockées sur une base standard de 4 portions puis recalculées.

Prévoir une architecture suffisamment souple pour changer plus tard la composition du foyer.

---

# 10. Saisons françaises

L'application doit être synchronisée avec les saisons en France métropolitaine.

Utiliser :

- hiver ;
- printemps ;
- été ;
- automne.

Mais ne pas se limiter à changer une couleur dans l'interface.

Les saisons doivent réellement influencer les repas proposés.

Associer les recettes et ingrédients à leurs périodes appropriées.

Par exemple :

## Printemps

Favoriser :

- asperges ;
- petits pois ;
- radis ;
- épinards ;
- fraises ;
- jeunes légumes.

## Été

Favoriser :

- tomates ;
- courgettes ;
- aubergines ;
- poivrons ;
- concombre ;
- melon ;
- pêches ;
- plats légers ;
- salades.

## Automne

Favoriser :

- courges ;
- potimarron ;
- champignons ;
- poireaux ;
- pommes ;
- poires ;
- plats mijotés.

## Hiver

Favoriser :

- poireaux ;
- pommes de terre ;
- choux ;
- carottes ;
- endives ;
- courges ;
- soupes ;
- gratins ;
- plats réconfortants.

Utiliser également le **mois courant** pour avoir une sélection plus fine.

---

# 11. Design saisonnier

L'identité visuelle de l'application évolue légèrement selon la saison.

Pas de changement caricatural.

Conserver la même identité graphique générale.

Faire varier subtilement :

- couleurs secondaires ;
- illustrations ;
- arrière-plans ;
- petites décorations ;
- icônes ;
- ambiance.

## Printemps

Ambiance :

- vert tendre ;
- crème ;
- fleurs discrètes.

## Été

Ambiance :

- tons lumineux ;
- pêche ;
- jaune doux ;
- vert.

## Automne

Ambiance :

- terracotta ;
- cuivre ;
- orange doux ;
- vert forêt.

## Hiver

Ambiance :

- bleu profond ;
- crème ;
- tons chaleureux.

Les transitions entre saisons doivent être élégantes.

---

# 12. Interface principale

La page d'accueil doit immédiatement afficher le planning de la semaine.

Desktop :

présentation sous forme de grandes cartes ou grille élégante.

Mobile :

présentation verticale parfaitement adaptée au tactile.

Chaque carte repas affiche au minimum :

- jour ;
- midi / soir ;
- photo du plat ;
- nom ;
- temps total ;
- quelques informations utiles ;
- bouton pour consulter ;
- bouton pour changer ;
- bouton de verrouillage.

Le repas du jour doit être visuellement mis en valeur.

---

# 13. Aujourd'hui

Créer une zone importante :

**Aujourd'hui**

Elle doit afficher directement le repas prévu aujourd'hui.

Exemple :

> Ce soir  
> Poulet basquaise  
> 15 min de préparation · 35 min de cuisson

Bouton :

**Voir la recette**

Le but est qu'en ouvrant l'application depuis le téléphone, l'utilisateur sache immédiatement ce qu'il doit préparer.

---

# 14. Liste de courses

Implémenter une liste de courses automatique.

À partir des recettes de la semaine, agréger les ingrédients nécessaires.

Par exemple :

3 recettes demandent des carottes :

- 300 g ;
- 500 g ;
- 200 g.

La liste affiche :

**Carottes — 1 kg**

Regrouper les produits par catégorie :

- fruits et légumes ;
- viande ;
- poisson ;
- produits frais ;
- crèmerie ;
- épicerie ;
- féculents ;
- conserves ;
- surgelés ;
- divers.

Permettre de cocher les articles achetés depuis le téléphone.

Les cases cochées doivent rester synchronisées entre appareils.

---

# 15. Exclusion de certains ingrédients

Prévoir dans les paramètres une gestion :

**Nous n'aimons pas**

L'utilisateur peut ajouter des ingrédients qu'il souhaite éviter.

Exemples :

- champignons ;
- coriandre ;
- poisson ;
- poivrons.

Les recettes contenant ces éléments doivent être exclues des futures propositions.

Prévoir également :

**Allergies / exclusions**

avec une architecture séparée.

---

# 16. Favoris

Pouvoir ajouter une recette aux favoris avec une icône cœur.

Les favoris doivent avoir davantage de chances de réapparaître dans les semaines suivantes sans devenir systématiques.

Créer une page :

**Nos favoris**

---

# 17. Historique

Enregistrer les repas réellement planifiés.

Créer une page :

**Historique**

Permettant de consulter :

- semaines précédentes ;
- recettes déjà consommées ;
- fréquence d'une recette ;
- dernière date à laquelle elle a été proposée.

Cette information doit être utilisée par l'algorithme.

Éviter de reproposer une recette consommée très récemment.

---

# 18. Anti-répétition

Implémenter un score de sélection des recettes.

La sélection ne doit pas être un simple :

```js
Math.random()
```

Chaque recette peut recevoir un score selon :

- saison ;
- mois ;
- catégorie ;
- dernière utilisation ;
- présence dans les favoris ;
- temps de préparation ;
- diversité avec le reste de la semaine ;
- compatibilité enfant ;
- exclusions utilisateur.

Par exemple, une recette consommée la semaine précédente doit être fortement pénalisée.

---

# 19. Temps de préparation

Favoriser les repas relativement simples les soirs de semaine.

Du lundi au jeudi, privilégier généralement :

- préparation ≤ 30 minutes ;
- cuisson raisonnable.

Le vendredi et le week-end peuvent comporter des recettes légèrement plus longues.

Cette règle ne doit pas être absolue mais influencer la génération.

---

# 20. Impression

L'application sera utilisée sur PC notamment pour l'impression.

Créer une mise en page dédiée :

**Imprimer la semaine**

Elle doit produire un rendu A4 extrêmement propre.

Inclure :

- semaine concernée ;
- lundi → dimanche ;
- repas midi/soir concernés ;
- noms des recettes ;
- éventuellement temps de préparation.

Créer également :

**Imprimer la liste de courses**

avec :

- catégories ;
- ingrédients ;
- quantités ;
- petites cases à cocher.

Utiliser :

```css
@media print
```

Masquer pendant l'impression :

- menus ;
- boutons ;
- navigation ;
- éléments PWA inutiles.

L'impression doit être réellement conçue et testée en A4 et pas simplement être la page web imprimée telle quelle.

---

# 21. PWA

L'application doit être une véritable Progressive Web App.

Prévoir :

- `manifest.webmanifest` ;
- service worker ;
- icônes ;
- installation Android ;
- installation iOS autant que possible ;
- installation desktop ;
- mode standalone ;
- cache des assets ;
- page utilisable en connexion dégradée.

Nom provisoire :

**À Table !**

Prévoir les métadonnées PWA correctement.

---

# 22. Synchronisation

Les données doivent être communes entre le téléphone et le PC.

Il ne faut donc pas stocker les données principales uniquement dans `localStorage`.

Utiliser une base PostgreSQL hébergée sur Railway.

`localStorage` ou IndexedDB peuvent être utilisés comme cache local, mais PostgreSQL reste la source de vérité.

La modification d'une semaine depuis le téléphone doit être visible depuis le PC.

---

# 23. Architecture technique recommandée

Utiliser de préférence :

## Frontend

- React ;
- TypeScript ;
- Vite ;
- Tailwind CSS ;
- React Router ;
- Lucide Icons ;
- Framer Motion pour quelques animations sobres.

## PWA

Utiliser :

`vite-plugin-pwa`

## Backend

Utiliser :

- Node.js ;
- TypeScript ;
- Express ou Fastify.

## Base de données

Utiliser :

- PostgreSQL Railway ;
- Prisma ORM.

Le frontend et l'API peuvent vivre dans le même repository.

Architecture possible :

```text
Cuisine/
├── src/
│   ├── components/
│   ├── pages/
│   ├── features/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   ├── types/
│   └── data/
│
├── server/
│   ├── routes/
│   ├── services/
│   ├── prisma/
│   └── utils/
│
├── public/
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── package.json
├── vite.config.ts
├── railway.json
├── README.md
└── .env.example
```

Adapte cette architecture si une solution plus propre est pertinente.

---

# 24. Base de données

Prévoir au minimum les entités :

```text
Household
Recipe
Ingredient
RecipeIngredient
WeeklyPlan
MealSlot
Favorite
ExcludedIngredient
ShoppingList
ShoppingListItem
MealHistory
Settings
```

Utiliser de véritables relations SQL.

Ne pas mettre toute la structure applicative dans un gros champ JSON si des relations SQL classiques sont plus pertinentes.

---

# 25. Seed initial

Créer un vrai script :

```text
prisma/seed.ts
```

contenant au minimum **50 recettes complètes**.

Pour chaque recette :

- vrai titre ;
- vraie description ;
- vrais ingrédients ;
- vraies quantités ;
- vraies étapes ;
- temps réalistes ;
- catégorie ;
- saisons ;
- mois compatibles ;
- difficulté ;
- compatibilité enfant.

La base doit être immédiatement utilisable après :

```bash
npx prisma migrate deploy
npx prisma db seed
```

---

# 26. Images des recettes

Prévoir une stratégie propre pour les images.

Ne pas utiliser d'URLs d'images aléatoires susceptibles de disparaître.

Pour la V1, si aucune banque d'images stable n'est intégrée, utiliser de beaux placeholders générés localement et cohérents avec le design.

L'architecture doit permettre ensuite d'associer facilement une vraie image à chaque recette.

Ne jamais afficher une image cassée.

---

# 27. Navigation

Sur mobile, utiliser une barre de navigation inférieure.

Exemple :

- Semaine ;
- Courses ;
- Recettes ;
- Favoris ;
- Réglages.

Sur desktop, utiliser une navigation adaptée à un écran large.

La navigation mobile doit rester facilement utilisable à une main.

---

# 28. Animations

Ajouter des animations discrètes et qualitatives :

- changement de semaine ;
- remplacement d'un plat ;
- ouverture d'une recette ;
- apparition des alternatives ;
- validation d'un article de courses ;
- verrouillage d'un repas.

Utiliser Framer Motion si pertinent.

Éviter :

- animations longues ;
- effets gadget ;
- animations empêchant l'utilisation rapide de l'application.

---

# 29. État de chargement

Toutes les opérations réseau doivent avoir des états clairs :

- skeleton ;
- chargement ;
- succès ;
- erreur.

Ne jamais laisser l'utilisateur face à une page blanche.

Ajouter un système de toast discret pour les actions telles que :

- repas changé ;
- repas verrouillé ;
- favori ajouté ;
- liste mise à jour.

---

# 30. Responsive

Tester au minimum les largeurs :

```text
360 px
390 px
430 px
768 px
1024 px
1440 px
1920 px
```

Aucun scroll horizontal ne doit être présent.

Les boutons tactiles doivent être suffisamment grands.

---

# 31. Accessibilité

Respecter les bonnes pratiques :

- contraste ;
- navigation clavier ;
- labels ;
- focus visible ;
- boutons accessibles ;
- `aria-label` lorsque nécessaire ;
- HTML sémantique.

---

# 32. Authentification

Pour la première version, l'application est utilisée par un seul foyer.

Ne pas complexifier inutilement le produit avec un système multi-tenant complet.

Prévoir néanmoins une architecture permettant d'ajouter ultérieurement plusieurs comptes ou foyers.

Si une authentification est nécessaire pour éviter qu'une URL publique permette à n'importe qui de modifier les données, mettre en place un système simple et sécurisé.

Ne jamais mettre de secret dans le frontend.

---

# 33. API

Créer une API structurée.

Exemples :

```text
GET    /api/recipes
GET    /api/recipes/:id

GET    /api/plans/current
GET    /api/plans/:week

POST   /api/plans/generate
POST   /api/plans/:planId/replace-meal

PATCH  /api/meals/:id/lock

GET    /api/shopping-list/:week
PATCH  /api/shopping-list/items/:id

GET    /api/favorites
POST   /api/favorites/:recipeId
DELETE /api/favorites/:recipeId

GET    /api/settings
PATCH  /api/settings
```

Utiliser une validation des entrées avec Zod ou équivalent.

---

# 34. Calcul des semaines

Respecter le format français :

- semaine commençant le lundi ;
- dates affichées en français ;
- locale `fr-FR` ;
- fuseau Europe/Paris.

Exemple :

**Semaine du 5 au 11 octobre 2026**

---

# 35. Tableau de bord

L'accueil peut afficher :

```text
Bonjour 👋

Cette semaine
5 → 11 octobre

Aujourd'hui
──────────────
Poulet rôti aux légumes
25 min · Facile

[ Voir la recette ]

Cette semaine
──────────────
Lun. soir     ...
Mar. soir     ...
Mer. soir     ...
...
```

Le design réel doit être beaucoup plus travaillé que cet exemple textuel.

---

# 36. Expérience utilisateur

Le produit doit donner l'impression d'une application grand public moderne et finalisée.

Références d'esprit :

- interface claire d'une application Apple ;
- simplicité de Notion ;
- cartes modernes ;
- qualité d'une application de cuisine premium.

Ne copie pas visuellement ces services.

Créer une identité propre.

Éviter absolument l'aspect :

- dashboard administratif ;
- Bootstrap générique ;
- projet étudiant ;
- démo d'IA ;
- gros blocs gris ;
- tableaux techniques.

---

# 37. Performance

Optimiser :

- bundle ;
- lazy loading ;
- images ;
- cache ;
- requêtes SQL ;
- rendu React.

Objectifs Lighthouse raisonnables :

- Performance > 90 ;
- Accessibility > 90 ;
- Best Practices > 90 ;
- PWA correctement installable.

---

# 38. Railway

Le projet doit pouvoir être déployé directement sur Railway depuis GitHub.

Préparer :

- scripts npm ;
- variables d'environnement ;
- migration Prisma ;
- démarrage production ;
- configuration du port via `process.env.PORT`.

Exemple :

```env
DATABASE_URL=
NODE_ENV=production
```

Ne jamais versionner `.env`.

Créer `.env.example`.

Railway fournira PostgreSQL.

---

# 39. Scripts NPM

Prévoir notamment :

```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "start": "...",
    "lint": "...",
    "typecheck": "...",
    "db:migrate": "...",
    "db:seed": "..."
  }
}
```

Ils doivent réellement fonctionner.

---

# 40. README

Créer un README complet expliquant :

- objectif du projet ;
- architecture ;
- prérequis ;
- installation ;
- développement local ;
- PostgreSQL ;
- Prisma ;
- variables d'environnement ;
- seed des recettes ;
- build ;
- lancement ;
- déploiement Railway ;
- fonctionnement PWA.

---

# 41. Qualité du code

Utiliser :

- TypeScript strict ;
- composants réutilisables ;
- séparation UI / métier / accès aux données ;
- fonctions courtes ;
- types propres ;
- noms explicites ;
- gestion centralisée des erreurs.

Ne pas créer un seul fichier React gigantesque.

Ne pas multiplier non plus artificiellement les fichiers minuscules.

---

# 42. Priorité produit

Ordre de priorité :

1. planning hebdomadaire ;
2. génération intelligente ;
3. remplacement individuel d'un repas ;
4. recettes ;
5. saisonnalité ;
6. liste de courses ;
7. synchronisation ;
8. expérience mobile ;
9. impression ;
10. PWA ;
11. favoris ;
12. historique ;
13. paramètres.

---

# 43. Première livraison attendue

Je veux une première version réellement fonctionnelle, et non une simple maquette.

Elle doit permettre de :

1. ouvrir l'application ;
2. générer une semaine ;
3. obtenir 9 repas ;
4. ouvrir chaque recette ;
5. remplacer individuellement un plat ;
6. verrouiller un plat ;
7. naviguer d'une semaine à l'autre ;
8. consulter la liste de courses calculée ;
9. cocher les courses ;
10. ajouter une recette aux favoris ;
11. conserver les données dans PostgreSQL ;
12. installer l'application comme PWA ;
13. utiliser l'application sur mobile ;
14. utiliser l'application sur desktop ;
15. imprimer le menu ;
16. imprimer la liste de courses.

---

# 44. Méthode de développement

Ne te contente pas de me donner des extraits de code ou une proposition d'architecture.

Travaille directement dans le repository.

Procède progressivement.

Avant chaque changement important :

1. inspecte les fichiers existants ;
2. conserve ce qui fonctionne ;
3. évite les régressions.

Après implémentation :

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

Corrige les erreurs avant de considérer la tâche terminée.

Teste également les routes principales et la génération des menus.

---

# 45. Git

Faire des commits propres et cohérents.

Exemples :

```text
feat: initialize family meal planner PWA
feat: add seasonal recipe database
feat: add weekly meal generation
feat: add meal replacement workflow
feat: add shopping list
feat: add print layouts
feat: add Railway deployment configuration
```

Ne pas écraser inutilement l'historique Git.

---

# 46. Ne pas faire

Ne pas :

- créer uniquement une maquette ;
- utiliser des données Lorem Ipsum ;
- utiliser 10 recettes répétées ;
- utiliser une API externe payante ;
- dépendre d'une IA externe pour générer chaque repas ;
- mettre les secrets dans Git ;
- stocker toutes les données uniquement en localStorage ;
- régénérer toute une semaine lorsqu'un seul repas est remplacé ;
- supprimer un repas verrouillé ;
- casser l'impression sur desktop ;
- sacrifier le mobile ;
- créer une UI de dashboard professionnel générique.

---

# 47. Vision du produit

Le scénario idéal doit devenir :

> J'ouvre l'application le dimanche.

> Elle connaît la saison et la période de l'année.

> Je génère la semaine.

> Elle me propose automatiquement les repas pour ma famille.

> Je n'aime pas le plat de jeudi : je le remplace en deux secondes.

> Je verrouille les plats qui me plaisent.

> Ma liste de courses est automatiquement recalculée.

> Je l'utilise sur mon téléphone dans le magasin.

> Le soir, j'ouvre l'application et elle m'indique immédiatement ce que nous mangeons et comment le préparer.

> Sur le PC, je peux imprimer proprement le planning de la semaine ou la liste de courses.

Le produit doit être pensé autour de cette expérience.