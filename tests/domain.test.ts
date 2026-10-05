import { test } from "node:test";
import assert from "node:assert/strict";
import { RECIPES } from "../shared/recipes.js";
import {
  DEFAULT_SETTINGS,
  adultEquivalent,
  scaledIngredients,
  aggregateShopping,
  generateMeals,
  weekSlots,
  monday,
  parisToday,
  alternatives,
  compatible,
  scoreRecipe,
  seasonFor,
} from "../shared/domain.js";
test("catalogue : au moins 50 recettes complètes avec des ingrédients et des étapes spécifiques", () => {
  assert.ok(RECIPES.length >= 50);
  assert.equal(new Set(RECIPES.map((r) => r.id)).size, RECIPES.length);
  for (const recipe of RECIPES) {
    assert.ok(recipe.ingredients.length >= 4);
    assert.ok(recipe.instructions.length >= 4);
    assert.equal(recipe.totalTime, recipe.preparationTime + recipe.cookingTime);
    assert.ok(recipe.months.length);
    assert.ok(recipe.seasons.length);
    assert.ok(recipe.image.startsWith("/images/"));
    for (const ingredient of recipe.ingredients)
      assert.ok(
        ingredient.quantity > 0 &&
          ingredient.name &&
          ingredient.unit &&
          ingredient.category,
      );
  }
});
test("le foyer par défaut représente 2,5 portions adultes et les quantités sont centralisées", () => {
  assert.equal(adultEquivalent(DEFAULT_SETTINGS.household), 2.5);
  const recipe = RECIPES[0];
  assert.equal(
    scaledIngredients(recipe, DEFAULT_SETTINGS.household)[0].quantity,
    562.5,
  );
  assert.equal(
    adultEquivalent({
      adults: 1,
      children: [{ age: 2 }, { age: 8 }, { age: 15 }],
    }),
    3.05,
  );
});
test("œufs, fruits entiers et tranches restent des quantités cuisinables", () => {
  const eggs = RECIPES.find((r) => r.id === "quiche-lorraine")!;
  assert.equal(
    scaledIngredients(eggs, DEFAULT_SETTINGS.household).find(
      (i) => i.name === "Œufs",
    )?.quantity,
    2,
  );
  assert.equal(
    scaledIngredients(
      RECIPES.find((r) => r.id === "saumon-four")!,
      DEFAULT_SETTINGS.household,
    ).find((i) => i.name === "Citron")?.quantity,
    1,
  );
});
test("semaines françaises, Europe/Paris et changement d’année", () => {
  assert.equal(monday("2027-01-03"), "2026-12-28");
  assert.equal(parisToday(new Date("2026-10-04T22:30Z")), "2026-10-05");
  assert.equal(weekSlots("2026-10-05").length, 9);
  assert.equal(
    weekSlots("2026-10-05").filter((m) => m.period === "midi").length,
    2,
  );
  assert.equal(seasonFor("2026-12-01"), "hiver");
});
test("génération : 9 plats uniques, variés, majoritairement de saison sur les douze mois", () => {
  for (let month = 1; month <= 12; month++)
    for (let sample = 0; sample < 30; sample++) {
      const week = monday(`2026-${String(month).padStart(2, "0")}-15`);
      const result = generateMeals(RECIPES, weekSlots(week), {
        settings: DEFAULT_SETTINGS,
        recent: [],
        favorites: [],
        salt: `test-${sample}`,
      });
      assert.equal(new Set(result.map((m) => m.recipeId)).size, 9);
      const selected = result.map((m) =>
        RECIPES.find((r) => r.id === m.recipeId)!,
      );
      assert.ok(
        selected.filter((r) => r.months.includes(month)).length >= 7,
        `mois ${month}`,
      );
      assert.ok(selected.filter((r) => r.starch === "pâtes").length <= 2);
      assert.ok(selected.filter((r) => r.protein === "poulet").length <= 2);
      for (let i = 1; i < selected.length; i++)
        assert.ok(
          selected[i].light || selected[i - 1].light,
          "éviter deux plats lourds consécutifs",
        );
    }
});
test("verrouillage conservé et alternatives distinctes des huit autres repas", () => {
  const slots = weekSlots("2026-10-05");
  slots[2].recipeId = RECIPES[0].id;
  slots[2].locked = true;
  const context = {
    settings: DEFAULT_SETTINGS,
    recent: [],
    favorites: [],
    salt: "locks",
  };
  const result = generateMeals(RECIPES, slots, context);
  assert.deepEqual(result[2], slots[2]);
  const candidates = alternatives(
    RECIPES,
    {
      ...context,
      slot: result[0],
      others: result
        .slice(1)
        .map((m) => RECIPES.find((r) => r.id === m.recipeId)!),
    },
    result[0].recipeId,
  );
  assert.equal(candidates.length, 3);
  assert.ok(candidates.every((c) => !result.some((m) => m.recipeId === c.id)));
});
test("exclusions et allergies séparées, exclusion générique poisson, lait de coco sans allergène lait", () => {
  assert.equal(
    compatible(
      RECIPES.find((r) => r.id === "pates-thon")!,
      { ...DEFAULT_SETTINGS, dislikes: ["poisson"] },
    ),
    false,
  );
  assert.equal(
    compatible(
      RECIPES.find((r) => r.id === "risotto-champignons")!,
      { ...DEFAULT_SETTINGS, exclusions: ["champignon"] },
    ),
    false,
  );
  assert.equal(
    compatible(
      RECIPES.find((r) => r.id === "lasagnes")!,
      { ...DEFAULT_SETTINGS, allergies: ["gluten"] },
    ),
    false,
  );
  assert.equal(
    RECIPES.find((r) => r.id === "dahl-lentilles")!.allergens.includes("lait"),
    false,
  );
});
test("historique pénalise fortement une recette de la semaine précédente, favori garde un bonus modeste", () => {
  const recipe = RECIPES[0],
    context = {
      slot: weekSlots("2026-10-05")[0],
      others: [],
      settings: DEFAULT_SETTINGS,
      recent: [],
      favorites: [],
      salt: "scores",
    };
  const score = scoreRecipe(recipe, context);
  assert.ok(
    scoreRecipe(recipe, {
      ...context,
      recent: [{ recipeId: recipe.id, date: "2026-09-28" }],
    }) <
      score - 70,
  );
  assert.equal(
    scoreRecipe(recipe, { ...context, favorites: [recipe.id] }),
    score + 8,
  );
});
test("courses : conversions kg/g et l/ml, regroupement et unités incompatibles séparées", () => {
  const recipe = {
    ...RECIPES[0],
    servings: 4,
    ingredients: [
      { name: "Carottes", quantity: 300, unit: "g", category: "Légumes" },
      { name: "Carottes", quantity: 0.7, unit: "kg", category: "Légumes" },
      { name: "Lait", quantity: 0.5, unit: "l", category: "Crèmerie" },
      { name: "Lait", quantity: 500, unit: "ml", category: "Crèmerie" },
      { name: "Carottes", quantity: 1, unit: "pièce", category: "Légumes" },
    ],
  };
  const items = aggregateShopping([recipe], { adults: 4, children: [] });
  assert.equal(
    items.find((i) => i.name === "Carottes" && i.unit === "g")?.quantity,
    1000,
  );
  assert.equal(items.find((i) => i.name === "Lait")?.quantity, 1000);
  assert.equal(items.length, 3);
});
test("aucun changement partiel si les exclusions rendent la génération impossible", () => {
  const slots = weekSlots("2026-10-05"),
    before = JSON.stringify(slots);
  assert.throws(() =>
    generateMeals([], slots, {
      settings: DEFAULT_SETTINGS,
      recent: [],
      favorites: [],
      salt: "empty",
    }),
  );
  assert.equal(JSON.stringify(slots), before);
});
