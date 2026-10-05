# Design À Table

Le thème conserve le crème, le vert sauge et le terracotta. `src/design.css` complète les styles existants : accueil photographique, cartes, courses, filtres, formulaires, fiches et navigation mobile. Les images sont locales, compressées en WebP et incluses dans le cache PWA.

## Images

Créées avec l’outil intégré imagegen, puis exportées en WebP avec Sharp. Ce sont des images réalistes générées, illustratives par famille de plats, pas des photographies des recettes réalisées par le foyer. Les fiches portent la mention « Idée de présentation ». Les anciennes illustrations en base restent compatibles : `FoodImage` choisit leur équivalent photographique, sans migration des données.

Assets : `public/images/family-table.webp`, `bake.webp`, `fish.webp`, `pasta.webp`, `salad.webp`, `soup.webp`, `stew.webp`, `vegetables.webp`, `chicken.webp`, `gratin.webp`, `lentils.webp`.

## Prompts utilisés

Accueil :

> Use case: photorealistic-natural. Asset type: hero photograph for French family meal planning app À Table. Generate an editorial food photograph, landscape 3:2 composition, no text. A welcoming real home dining table, natural oak, wrinkled ivory linen, handmade sage ceramic plates, central ceramic dish of roasted autumn vegetables carrots pumpkin and potatoes with herbs, crusty bread and simple water glasses, softly lit by a window, warm understated French countryside atmosphere, tactile real food and surfaces, elegant but lived-in, no people, no hands. Main food concentrated toward center/right, left side quieter with linen and soft shadows for optional text overlay. Camera slightly above table, close enough for appetizing details, natural depth of field. Colors cream, sage green, warm terracotta. No illustration, no logos, no watermark, no lettering.

Prompt commun des plats, où `{subject}` est remplacé par chaque sujet ci-dessous :

> Use case: photorealistic-natural. Asset type: illustrative food photograph for family recipe cards in a French meal planner. Subject: {subject}. Landscape 3:2 image, food centered and filling most of frame so safe to crop to landscape card. Real food editorial photography, slightly overhead at 45 degrees, natural window light, oak tabletop and cream linen, warm muted sage and terracotta palette, realistic appetizing textures, simple generous family cooking, no people or hands, no letters, no text, no watermark, no logos, no collage, one coherent photograph.

| Asset | Subject |
| --- | --- |
| bake | A golden French vegetable quiche with leeks and goat cheese in an ivory ceramic tart dish, a cut wedge revealing filling, small green salad beside it |
| fish | A gently cooked white fish fillet, carrot puree and roasted potatoes, arranged on a sage ceramic dinner plate, dill and lemon wedge beside it |
| pasta | A generous bowl of spaghetti with a rich tomato and minced meat bolognese sauce, fresh basil and a little grated parmesan |
| salad | A fresh generous family salad in a ceramic bowl, lentils, sliced tomatoes, roasted vegetables and leafy greens, simple vinaigrette |
| soup | A velvety orange pumpkin soup in a rustic cream ceramic bowl, pumpkin seeds and herbs, sliced crusty bread beside it |
| stew | A homemade French slow-cooked stew with pieces of meat, carrots and potatoes, rustic casserole, appetizing natural sauce, parsley |
| vegetables | A hearty plate of roasted carrots, squash, potatoes and cauliflower, herbs and olive oil, sage ceramic plate |
| chicken | Mild homemade chicken curry, clearly recognizable pieces of chicken in a golden coconut curry sauce with carrots, served beside fluffy rice in a sage ceramic bowl |
| gratin | A golden baked cauliflower and potato gratin in a shallow ivory ceramic baking dish, browned cheese and creamy vegetables, no pastry crust |
| lentils | A generous bowl of cooked green lentils simmered with diced carrots and herbs, unmistakable small lentils visible, vegetarian, no meat |
