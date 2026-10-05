import type { Recipe } from "./types.js";

// Stable catalogue IDs keep old database records compatible with precise photos.
const catalogueIds = new Set([
  "hachis-parmentier", "poulet-roti", "gratin-dauphinois", "lasagnes",
  "spaghetti-bolognaise", "quiche-lorraine", "saumon-four", "curry-poulet",
  "risotto-champignons", "croque-monsieur", "soupe-legumes", "tartiflette",
  "blanquette-veau", "chili-carne", "papillote-poisson", "poulet-basquaise",
  "gratin-courgettes", "veloute-potimarron", "pates-poireaux", "lentilles-carottes",
  "omelette-champignons", "porc-moutarde", "boulettes-tomate", "couscous-legumes",
  "riz-cantonais", "pates-epinards", "tarte-asperges", "poulet-citron",
  "salade-pates", "ratatouille-oeufs", "tomates-farcies", "salade-riz-thon",
  "aubergines-parmesan", "taboule-pois-chiches", "gratin-chou-fleur", "endives-jambon",
  "saucisses-lentilles", "boeuf-carottes", "poelee-potiron", "tarte-poireaux",
  "poulet-champignons", "colin-carottes", "nouilles-poulet", "dahl-lentilles",
  "chili-sin-carne", "gnocchis-epinards", "frittata-legumes", "pates-thon",
  "saumon-courgettes", "poulet-pommes", "gratin-butternut", "soupe-chou",
  "tofu-brocoli", "galettes-lentilles", "truite-four", "poulet-semoule",
  "salade-lentilles", "soupe-petits-pois", "boulgour-legumes", "tortilla-pommes-terre",
]);

export function recipeImage(recipe: Pick<Recipe, "id" | "image" | "source">): string | null {
  if (recipe.source !== "custom" && catalogueIds.has(recipe.id))
    return `/images/recipes/${recipe.id}.webp`;
  // A generic stock dish is misleading for an unknown personal recipe.
  if (!recipe.image || /^\/images\/(?:harvest|bake|fish|pasta|salad|soup|stew|vegetables)\.svg$/.test(recipe.image))
    return null;
  return recipe.image;
}
