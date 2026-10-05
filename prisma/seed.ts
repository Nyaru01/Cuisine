import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { RECIPES } from "../shared/recipes.js";
import { normalize } from "../shared/domain.js";
const db = new PrismaClient();
try {
  for (const recipe of RECIPES) {
    const {
      ingredients,
      createdAt: _created,
      updatedAt: _updated,
      ...data
    } = recipe;
    void _created;
    void _updated;
    await db.$transaction(async (tx) => {
      await tx.recipe.upsert({
        where: { id: recipe.id },
        create: data,
        update: data,
      });
      await tx.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
      for (const ingredient of ingredients) {
        const id = `${normalize(ingredient.name)}:${ingredient.unit}`;
        await tx.ingredient.upsert({
          where: { id },
          create: {
            id,
            name: ingredient.name,
            unit: ingredient.unit,
            category: ingredient.category,
          },
          update: { name: ingredient.name, category: ingredient.category },
        });
        await tx.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientId: id,
            quantity: ingredient.quantity,
          },
        });
      }
    });
  }
  await db.household.upsert({
    where: { id: "family" },
    create: {
      id: "family",
      adults: 2,
      children: { create: [{ age: 5 }] },
      settings: { create: { maxPrep: 30, allergies: [] } },
    },
    update: {},
  });
  console.log(
    `${RECIPES.length} recettes complètes disponibles. Le foyer existant est conservé.`,
  );
} finally {
  await db.$disconnect();
}
