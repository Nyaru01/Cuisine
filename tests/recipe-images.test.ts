import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { RECIPES } from "../shared/recipes.js";
import { recipeImage } from "../shared/recipe-images.js";

test("each catalogue recipe has its own existing WebP photo, including old database images", () => {
  const images = RECIPES.map(recipeImage);
  assert.equal(new Set(images).size, RECIPES.length);
  for (const [index, image] of images.entries()) {
    assert.ok(image, RECIPES[index].name);
    assert.ok(existsSync(`public${image}`), `${RECIPES[index].name}: missing asset`);
    assert.equal(readFileSync(`public${image}`).subarray(8, 12).toString(), "WEBP");
  }
});

test("personal recipes never inherit a stock photo of another dish", () => {
  assert.equal(recipeImage({ id: "personal", source: "custom", image: "/images/harvest.svg" }), null);
  assert.equal(recipeImage({ id: "poulet-roti", source: "custom", image: "" }), null);
  assert.equal(recipeImage({ id: "personal", source: "custom", image: "/uploads/my-photo.webp" }), "/uploads/my-photo.webp");
});
