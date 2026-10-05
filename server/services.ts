import type {
  Recipe,
  Settings,
  Plan,
  Meal,
  ShoppingItem,
} from "../shared/types.js";
import {
  aggregateShopping,
  normalize,
  weekSlots,
  compatible,
  monday,
} from "../shared/domain.js";
import { db, type Transaction } from "./db.js";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function getRecipes(client: Transaction = db): Promise<Recipe[]> {
  const rows = await client.recipe.findMany({
    include: { ingredients: { include: { ingredient: true } } },
    orderBy: { name: "asc" },
  });
  return rows.map((row) => ({
    ...row,
    seasons: row.seasons as Recipe["seasons"],
    ingredients: row.ingredients.map((i) => ({
      name: i.ingredient.name,
      unit: i.ingredient.unit,
      category: i.ingredient.category,
      quantity: i.quantity,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}
export async function getSettings(client: Transaction = db): Promise<Settings> {
  const family = await client.household.findUnique({
    where: { id: "family" },
    include: { children: true, settings: true, exclusions: true },
  });
  if (!family?.settings)
    throw new ApiError(
      503,
      "Le foyer n’est pas initialisé. Exécutez le seed de la base.",
    );
  return {
    household: {
      adults: family.adults,
      children: family.children.map((c) => ({ age: c.age })),
    },
    maxPrep: family.settings.maxPrep,
    allergies: family.settings.allergies,
    dislikes: family.exclusions
      .filter((e) => e.kind === "dislike")
      .map((e) => e.name),
    exclusions: family.exclusions
      .filter((e) => e.kind === "exclusion")
      .map((e) => e.name),
  };
}
export async function getPlan(
  week: string,
  client: Transaction = db,
): Promise<Plan> {
  const plan = await client.weeklyPlan.findUnique({
    where: { householdId_week: { householdId: "family", week } },
    include: { meals: { orderBy: [{ date: "asc" }, { period: "asc" }] } },
  });
  return plan
    ? {
        id: plan.id,
        week: plan.week,
        version: plan.version,
        meals: plan.meals as Meal[],
      }
    : { id: "", week, version: 0, meals: weekSlots(week) };
}
export async function ensurePlan(
  week: string,
  version: number,
  tx: Transaction,
) {
  const plan = await tx.weeklyPlan.upsert({
    where: { householdId_week: { householdId: "family", week } },
    create: {
      householdId: "family",
      week,
      meals: {
        create: weekSlots(week).map((s) => ({
          date: s.date,
          period: s.period,
        })),
      },
    },
    update: {},
    include: { meals: { orderBy: [{ date: "asc" }, { period: "asc" }] } },
  });
  assertVersion(plan.version, version);
  return plan;
}
export function assertVersion(actual: number, requested: number) {
  if (actual !== requested)
    throw new ApiError(
      409,
      "La semaine a changé sur un autre appareil. Elle vient d’être actualisée ; réessayez.",
    );
}
export async function selectionContext(week: string, tx: Transaction) {
  const [settings, favorites, recent] = await Promise.all([
    getSettings(tx),
    tx.favorite.findMany({ where: { householdId: "family" } }),
    tx.mealHistory.findMany({
      where: { householdId: "family", meal: { plan: { week: { not: week } } } },
    }),
  ]);
  return {
    settings,
    favorites: favorites.map((f) => f.recipeId),
    recent: recent.map((r) => ({ recipeId: r.recipeId, date: r.date })),
  };
}
export async function saveMeals(
  planId: string,
  meals: Meal[],
  tx: Transaction,
) {
  for (const meal of meals) {
    await tx.mealSlot.update({
      where: { id: meal.id },
      data: { recipeId: meal.recipeId },
    });
    if (meal.recipeId)
      await tx.mealHistory.upsert({
        where: { mealId: meal.id },
        create: {
          householdId: "family",
          mealId: meal.id,
          recipeId: meal.recipeId,
          date: meal.date,
        },
        update: { recipeId: meal.recipeId },
      });
  }
  await tx.weeklyPlan.update({
    where: { id: planId },
    data: { version: { increment: 1 } },
  });
  await reconcileShopping(planId, tx);
}
export async function reconcileShopping(planId: string, tx: Transaction) {
  const plan = await tx.weeklyPlan.findUniqueOrThrow({
    where: { id: planId },
    include: { meals: true },
  });
  const [recipes, settings] = await Promise.all([
    getRecipes(tx),
    getSettings(tx),
  ]);
  const items = aggregateShopping(
    plan.meals
      .map((m) => recipes.find((r) => r.id === m.recipeId))
      .filter((r): r is Recipe => !!r),
    settings.household,
  ).filter((i) => normalize(i.name) !== "eau");
  const list = await tx.shoppingList.upsert({
    where: { planId },
    create: { planId },
    update: {},
    include: { items: true },
  });
  const keys = new Set(items.map((i) => `${i.name}|${i.unit}`));
  await tx.shoppingListItem.deleteMany({
    where: {
      listId: list.id,
      id: {
        in: list.items
          .filter((i) => !keys.has(`${i.name}|${i.unit}`))
          .map((i) => i.id),
      },
    },
  });
  for (const item of items) {
    const previous = list.items.find(
      (i) => i.name === item.name && i.unit === item.unit,
    );
    await tx.shoppingListItem.upsert({
      where: {
        listId_name_unit: { listId: list.id, name: item.name, unit: item.unit },
      },
      create: { ...item, listId: list.id },
      update: {
        ...item,
        checked:
          previous?.quantity === item.quantity ? previous.checked : false,
      },
    });
  }
}
export async function getShopping(week: string): Promise<ShoppingItem[]> {
  const list = await db.shoppingList.findFirst({
    where: { plan: { householdId: "family", week } },
    include: { items: { orderBy: [{ category: "asc" }, { name: "asc" }] } },
  });
  return list?.items ?? [];
}
export async function saveSettings(settings: Settings, tx: Transaction) {
  const recipes = await getRecipes(tx);
  const locked = await tx.mealSlot.findMany({
    where: {
      locked: true,
      plan: { householdId: "family", week: { gte: monday() } },
    },
  });
  if (
    locked.some((m) => {
      const recipe = recipes.find((r) => r.id === m.recipeId);
      return recipe && !compatible(recipe, settings);
    })
  )
    throw new ApiError(
      409,
      "Une exclusion concerne un repas verrouillé actuel ou futur. Déverrouillez ce repas avant de modifier ces réglages.",
    );
  await tx.household.update({
    where: { id: "family" },
    data: { adults: settings.household.adults },
  });
  await tx.child.deleteMany({ where: { householdId: "family" } });
  await tx.child.createMany({
    data: settings.household.children.map((c) => ({
      householdId: "family",
      age: c.age,
    })),
  });
  await tx.settings.update({
    where: { householdId: "family" },
    data: { maxPrep: settings.maxPrep, allergies: settings.allergies },
  });
  await tx.excludedIngredient.deleteMany({ where: { householdId: "family" } });
  await tx.excludedIngredient.createMany({
    data: [
      ...settings.dislikes.map((name) => ({ name, kind: "dislike" })),
      ...settings.exclusions.map((name) => ({ name, kind: "exclusion" })),
    ].map((e) => ({ ...e, householdId: "family" })),
    skipDuplicates: true,
  });
  const plans = await tx.weeklyPlan.findMany({
    where: { householdId: "family", week: { gte: monday() } },
  });
  for (const plan of plans) {
    await reconcileShopping(plan.id, tx);
    await tx.weeklyPlan.update({
      where: { id: plan.id },
      data: { version: { increment: 1 } },
    });
  }
}
