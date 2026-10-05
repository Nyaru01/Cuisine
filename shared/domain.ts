import type {
  Household,
  Settings,
  Recipe,
  Meal,
  Season,
  Ingredient,
} from "./types.js";
export const DEFAULT_SETTINGS: Settings = {
  household: { adults: 2, children: [{ age: 5 }] },
  dislikes: [],
  exclusions: [],
  allergies: [],
  maxPrep: 30,
};
export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export function parisToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}-${parts.find((p) => p.type === "day")!.value}`;
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function monday(date = parisToday()) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -(day === 0 ? 6 : day - 1));
}
export function seasonFor(date: string): Season {
  const m = Number(date.slice(5, 7));
  return m >= 3 && m <= 5
    ? "printemps"
    : m >= 6 && m <= 8
      ? "été"
      : m >= 9 && m <= 11
        ? "automne"
        : "hiver";
}
export function weekSlots(week: string): Meal[] {
  return Array.from({ length: 7 }, (_, day) =>
    (day < 5 ? ["soir"] : ["midi", "soir"]).map((period) => ({
      id: `${week}-${day}-${period}`,
      date: addDays(week, day),
      period: period as Meal["period"],
      recipeId: null,
      locked: false,
    })),
  ).flat();
}
// Coefficients culinaires ajustables, pas une prescription nutritionnelle.
export function adultEquivalent(h: Household) {
  return (
    h.adults +
    h.children.reduce(
      (sum, child) =>
        sum +
        (child.age < 3 ? 0.35 : child.age < 7 ? 0.5 : child.age < 12 ? 0.7 : 1),
      0,
    )
  );
}
export function scaledIngredients(recipe: Recipe, h: Household): Ingredient[] {
  const scale = adultEquivalent(h) / recipe.servings;
  return recipe.ingredients.map((i) => ({
    ...i,
    quantity: ["pièce", "tranche"].includes(i.unit)
      ? Math.ceil(i.quantity * scale)
      : Math.round(i.quantity * scale * 100) / 100,
  }));
}
export function displayQuantity(quantity: number, unit: string) {
  if ((unit === "g" || unit === "ml") && quantity >= 1000)
    return `${(quantity / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${unit === "g" ? "kg" : "l"}`;
  return `${quantity.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${unit}`;
}
const fish = [
  "saumon",
  "cabillaud",
  "colin",
  "thon",
  "truite",
  "sardine",
  "poisson",
];
export function compatible(recipe: Recipe, settings: Settings) {
  if (!recipe.childFriendly && settings.household.children.length) return false;
  if (
    settings.allergies.some((a) =>
      recipe.allergens.some((b) => normalize(a) === normalize(b)),
    )
  )
    return false;
  const ingredients = recipe.ingredients.map((i) => normalize(i.name));
  return ![...settings.dislikes, ...settings.exclusions].some((value) => {
    const word = normalize(value).replace(/s$/, "");
    return (
      ingredients.some((name) => name.includes(word)) ||
      (word === "poisson" &&
        (recipe.protein === "poisson" ||
          ingredients.some((name) => fish.some((f) => name.includes(f))))) ||
      (word === "viande" &&
        ["poulet", "bœuf", "porc", "veau"].includes(recipe.protein))
    );
  });
}
export interface SelectionContext {
  slot: Meal;
  others: Recipe[];
  recent: { recipeId: string; date: string }[];
  favorites: string[];
  settings: Settings;
  salt: string;
}
function stableNoise(value: string) {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}
export function scoreRecipe(recipe: Recipe, c: SelectionContext) {
  if (
    !compatible(recipe, c.settings) ||
    c.others.some((r) => r.id === recipe.id)
  )
    return -Infinity;
  const month = Number(c.slot.date.slice(5, 7));
  let score =
    (recipe.months.includes(month) ? 40 : -45) +
    (recipe.seasons.includes(seasonFor(c.slot.date)) ? 20 : -20);
  score += recipe.childFriendly ? 5 : 0;
  score += c.favorites.includes(recipe.id) ? 8 : 0;
  if (c.slot.recipeId === recipe.id) score -= 18;
  const weekday = new Date(`${c.slot.date}T12:00Z`).getUTCDay();
  if (weekday >= 1 && weekday <= 4)
    score -=
      Math.max(0, recipe.preparationTime - c.settings.maxPrep) * 2 +
      Math.max(0, recipe.totalTime - 50) * 0.6;
  for (const prev of c.recent) {
    const days = Math.abs(
      (Date.parse(c.slot.date) - Date.parse(prev.date)) / 86400000,
    );
    if (prev.recipeId === recipe.id && days < 28)
      score -= days < 8 ? 85 : days < 15 ? 45 : 15;
  }
  for (const other of c.others) {
    if (other.protein === recipe.protein) score -= recipe.vegetarian ? 7 : 30;
    if (other.starch === recipe.starch && recipe.starch !== "aucun")
      score -= recipe.starch === "pâtes" ? 40 : 18;
    if (other.style === recipe.style) score -= 12;
  }
  const previous = c.others.at(-1);
  if (previous?.style === recipe.style) score -= 20;
  if (previous && !previous.light && !recipe.light) score -= 25;
  return score + stableNoise(`${c.salt}:${c.slot.id}:${recipe.id}`) * 14;
}
export function alternatives(
  recipes: Recipe[],
  context: SelectionContext,
  exclude?: string | null,
) {
  return recipes
    .filter((r) => r.id !== exclude)
    .map((recipe) => ({ recipe, score: scoreRecipe(recipe, context) }))
    .filter((r) => Number.isFinite(r.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.recipe);
}
export function generateMeals(
  recipes: Recipe[],
  slots: Meal[],
  context: Omit<SelectionContext, "slot" | "others">,
): Meal[] {
  const result = slots.map((s) => ({ ...s }));
  const used = result
    .filter((s) => s.locked && s.recipeId)
    .map((s) => recipes.find((r) => r.id === s.recipeId)!)
    .filter(Boolean);
  for (const slot of result) {
    if (slot.locked) continue;
    const recipe = alternatives(
      recipes,
      { ...context, slot, others: used },
      null,
    )[0];
    if (!recipe)
      throw new Error(
        "Pas assez de recettes compatibles pour 9 repas différents. Ajustez vos exclusions ou déverrouillez un repas.",
      );
    slot.recipeId = recipe.id;
    used.push(recipe);
  }
  return result;
}
export function aggregateShopping(
  recipes: Recipe[],
  household: Household,
): Ingredient[] {
  const aggregated = new Map<string, Ingredient>();
  for (const recipe of recipes)
    for (const ingredient of scaledIngredients(recipe, household)) {
      let { quantity, unit } = ingredient;
      if (unit === "kg") {
        quantity *= 1000;
        unit = "g";
      }
      if (unit === "l") {
        quantity *= 1000;
        unit = "ml";
      }
      const key = `${normalize(ingredient.name)}|${unit}`;
      const existing = aggregated.get(key);
      aggregated.set(key, {
        ...ingredient,
        unit,
        quantity:
          Math.round(((existing?.quantity ?? 0) + quantity) * 100) / 100,
      });
    }
  return [...aggregated.values()].sort(
    (a, b) =>
      a.category.localeCompare(b.category, "fr") ||
      a.name.localeCompare(b.name, "fr"),
  );
}
