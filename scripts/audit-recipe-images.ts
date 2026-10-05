import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { RECIPES } from "../shared/recipes.js";
import { recipeImage } from "../shared/recipe-images.js";

await mkdir(".local/qa", { recursive: true });
const tiles = [];
for (const [index, recipe] of RECIPES.entries()) {
  const path = `public${recipeImage(recipe)}`;
  if (!existsSync(path)) continue;
  const thumb = await sharp(path).resize(260, 174).png().toBuffer();
  const label = recipe.name.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  const text = Buffer.from(`<svg width="280" height="32"><rect width="280" height="32" fill="#faf8f2"/><text x="10" y="20" font-size="12" fill="#243d31">${index + 1}. ${label}</text></svg>`);
  tiles.push({ recipe, thumb, text });
}
for (let page = 0; page * 12 < tiles.length; page++) {
  const batch = tiles.slice(page * 12, page * 12 + 12);
  const composite = batch.flatMap((tile, i) => {
    const left = (i % 3) * 280, top = Math.floor(i / 3) * 212;
    return [{ input: tile.thumb, left: left + 10, top }, { input: tile.text, left, top: top + 174 }];
  });
  await sharp({ create: { width: 840, height: Math.ceil(batch.length / 3) * 212, channels: 3, background: "#faf8f2" } }).composite(composite).png().toFile(`.local/qa/recipe-audit-${page + 1}.png`);
}
await writeFile(".local/qa/recipe-image-audit.json", JSON.stringify(tiles.map(t => ({ id: t.recipe.id, name: t.recipe.name, image: recipeImage(t.recipe) })), null, 2));
console.log(`${tiles.length}/${RECIPES.length} assets available for visual audit`);
