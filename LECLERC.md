# E.Leclerc Drive — test dans Cuisine

Dans **Courses → E.Leclerc Drive**, rechercher `69140 Rillieux-la-Pape`, sélectionner le Drive, préparer les correspondances, changer un produit ou sa quantité, puis valider. Le suivi montre les ajouts et les échecs ; le panier permet d’augmenter, diminuer ou retirer une ligne. Les courses cochées sont exclues de la préparation.

## Mode publié pour les essais

`LECLERC_INTEGRATION_ENABLED=true`, `DRIVE_PROVIDER_MODE=mock`.

Le bandeau **Mode démonstration** est permanent dans ce mode. Magasins, produits, prix et disponibilité sont des fixtures de test : aucune donnée commerciale E.Leclerc réelle, aucune commande, aucun transfert au site. Le Drive choisi et le panier sont persistés dans PostgreSQL. Le menu et les courses fonctionnent indépendamment du fournisseur.

La confirmation est distincte du matching. Les correspondances sont conservées avec la version du menu et le Drive : un changement exige une nouvelle préparation. La confirmation d’une même proposition est idempotente. Les ajouts sont séquentiels, leurs erreurs n’annulent pas les autres lignes, et les jobs persistent leur progression. Après une interruption, vérifier le panier avant de recommencer ; les mutations ne sont pas rejouées automatiquement.

## Mode réel et worker isolé

### Essai sur le PC du foyer

Le lanceur `scripts/start-leclerc-browser.ps1` ouvre un profil Chrome séparé dans `.local/leclerc-chrome`, avec son port de contrôle limité à la boucle locale. Se connecter manuellement à Leclerc et cliquer sur **Commencer mes courses**. Le test se fait dans Cuisine sur `http://127.0.0.1:3001/courses`, avec le worker local sur `127.0.0.1:3102` et le mode `live`. Le profil doit rester ouvert pendant l’essai. La version Railway continue à utiliser la démonstration ; elle ne peut pas joindre automatiquement ce worker local.

Le Drive confirmé dans la session du foyer est `010111`, Rillieux-la-Pape / Caluire-et-Cuire, sur `fd2-courses.leclercdrive.fr`. Le worker vérifie le magasin courant et utilise le chemin canonique du navigateur. La session du navigateur intégré n’est pas copiée dans ce profil. Les secrets locaux et le profil sont exclus de Git.

`server/drive/` contient l’interface DriveProvider, le matcher, le mock et l’adaptateur réseau Leclerc. `services/leclerc-connector/` contient le worker séparé : recherche de magasins, résolution du host, recherche de produits, parsing des conditionnements et du panier, mutations séquentielles et adaptateur navigateur CDP. L’application Web ne lance aucun navigateur.

Pour tester le worker sur une machine dédiée :

1. Démarrer Chrome avec un profil réservé à Leclerc et un port CDP lié à la boucle locale. Ouvrir E.Leclerc Drive et sélectionner son Drive réel dans ce navigateur. La connexion et tout challenge sont effectués manuellement ; aucun mécanisme de sécurité n’est désactivé.
2. Configurer `LECLERC_CDP_URL=http://127.0.0.1:9222`, un `LECLERC_CONNECTOR_TOKEN` aléatoire d’au moins 32 caractères et `LECLERC_REQUEST_DELAY_MS=1200`.
3. Lancer `npm run drive:worker`. Il écoute uniquement `127.0.0.1:3102`. Ne jamais exposer le port CDP. Le profil du navigateur conserve la session ; le worker ne lit, ne stocke et ne transmet aucun cookie ni mot de passe.
4. Pour un essai local, configurer l’API Cuisine avec `DRIVE_PROVIDER_MODE=live`, `LECLERC_CONNECTOR_URL=http://127.0.0.1:3102` et le même token de worker.
5. Pour Railway, héberger ce worker séparément sur une machine disposant de Chrome et d’un accès interactif pour la connexion. Relier Railway à son API via HTTPS authentifié ou un réseau privé. `localhost` de Railway ne correspond pas au PC du foyer. Ne pas activer le mode live sans cette liaison.

Le mode réel est expérimental et non officiel. Les chemins et formats ont été étudiés dans la [référence ouverte](https://github.com/skunkobi/mcp-leclerc-drive/blob/main/docs/api-capture.md), sans dépendance d’exécution à ce projet. Ils peuvent changer. Prix, stock, nom et conditionnement sont lus du fournisseur ; un conditionnement inconnu n’est pas inventé. Un refus 401/403 exige une reconnexion manuelle. Après trois erreurs, le circuit est ouvert une minute. Le résultat final et le paiement restent sur E.Leclerc.

**Validation réelle du 5 octobre 2026 sur le PC :** session manuelle du Drive Rillieux-la-Pape / Caluire-et-Cuire, lecture du panier vide, recherche de produits/prix/conditionnements et ajout d’un sachet de carottes Eco+ 2 kg à 2,49 € depuis Cuisine. Le panier fournisseur relu confirme un produit et 2,49 €. Aucun créneau réservé, aucune commande validée, aucun paiement. Railway reste en démonstration.

La modification des quantités a ensuite été vérifiée : deux sachets à 4,98 €, retour à un sachet à 2,49 €, puis retrait du produit de test et panier fournisseur revenu à 0,00 €. Les captures sont dans `.local/qa/leclerc-real-cart-success.png` et `.local/qa/leclerc-real-cart-empty.png` (exclues de Git).

Le test a nécessité de distinguer le chemin canonique des pages du chemin utilisé par les mutations, de choisir le bon onglet dans Chrome et de décoder les entités HTML des libellés. Les ingrédients sans conditionnement compatible restent sans proposition automatique. Le classement exclut plusieurs dérivés et plats préparés trompeurs (infusion pour thym, purée pour potimarron, lait fermenté, poulet avec os), mais chaque correspondance reste à relire. Les promotions et l’optimisation de budget des phases ultérieures du brief ne sont pas activées.

Les tests automatisés couvrent matcher, conversions, disponibilité, préférences, erreurs réseau/403/409/réponse invalide, parsing de fixtures, circuit breaker et parcours API de démonstration. Ils n’appellent pas Leclerc.

## Variables

`LECLERC_INTEGRATION_ENABLED=false` masque l’onglet et refuse les routes Drive. `DRIVE_PROVIDER_MODE` choisit `mock` ou `live`. `LECLERC_CONNECTOR_URL` et `LECLERC_CONNECTOR_TOKEN` sont réservés au serveur. `LECLERC_REQUEST_TIMEOUT_MS` vaut 15000 par défaut. Les recherches sont mises en cache dix minutes par magasin ; le panier est toujours relu. Les préférences de produits sont conservées par ingrédient et Drive, séparées des fixtures.

Les logs ne contiennent que fournisseur, opération, durée et succès ; aucun header, cookie, token ni réponse brute. Les tests CI n’appellent pas E.Leclerc.
