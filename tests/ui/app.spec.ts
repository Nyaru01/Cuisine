import { test, expect } from "@playwright/test";
import type { Plan } from "../../shared/types";
import { monday } from "../../shared/domain";
import fs from "node:fs/promises";
test("les jours français restent corrects quand l’appareil est dans un autre fuseau", async ({
  browser,
}) => {
  const context = await browser.newContext({
    timezoneId: "Pacific/Kiritimati",
  });
  const page = await context.newPage();
  await page.goto(process.env.APP_URL || "http://127.0.0.1:3001");
  await expect(page.locator(".meal-card")).toHaveCount(9);
  await expect(page.locator(".meal-day strong").first()).toHaveText("lundi");
  await context.close();
});
const week = monday();
test("parcours cuisine : génération, fiche, favori, verrouillage et changement individuel", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "La semaine se savoure." }),
  ).toBeVisible();
  const generate = page
    .getByRole("button", { name: /Générer ma semaine|Régénérer la semaine/ })
    .first();
  await generate.click();
  await expect(page.locator(".meal-card")).toHaveCount(9);
  await expect(
    page.getByRole("button", { name: "Régénérer la semaine" }),
  ).toBeEnabled();
  await page
    .locator(".meal-card")
    .first()
    .getByRole("button", { name: "La recette", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "En cuisine", exact: true }),
  ).toBeVisible();
  await expect(dialog.locator(".steps li")).toHaveCount(4);
  await dialog.getByRole("button", { name: "Étape 1 à terminer" }).click();
  await expect(
    dialog.getByRole("button", { name: "Étape 1 terminée" }),
  ).toHaveAttribute("aria-pressed", "true");
  const favorite = dialog.getByRole("button", {
    name: /Ajouter .* aux favoris|Retirer .* des favoris/,
  });
  if ((await favorite.getAttribute("aria-pressed")) === "false")
    await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Fermer", exact: true }).click();
  const initial = (await page.request
    .get(`/api/plans/${week}`)
    .then((r) => r.json())) as Plan;
  const card = page.locator(".meal-card").nth(2);
  const lock = card.getByRole("button", {
    name: /^Verrouiller le repas$|^Déverrouiller le repas$/,
  });
  if ((await lock.getAttribute("aria-pressed")) === "false") await lock.click();
  await expect(lock).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Régénérer la semaine" }).click();
  await expect(
    page.getByRole("button", { name: "Régénérer la semaine" }),
  ).toBeEnabled();
  const regenerated = (await page.request
    .get(`/api/plans/${week}`)
    .then((r) => r.json())) as Plan;
  expect(regenerated.meals[2].recipeId).toEqual(initial.meals[2].recipeId);
  const changeable = page
    .locator(".meal-card")
    .filter({
      has: page.getByRole("button", {
        name: "Changer",
        exact: true,
        disabled: false,
      }),
    })
    .first();
  await changeable
    .getByRole("button", { name: "Changer", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".recipe-card")).toHaveCount(3);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Choisir ce plat" })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const changed = (await page.request
    .get(`/api/plans/${week}`)
    .then((r) => r.json())) as Plan;
  expect(
    changed.meals.filter(
      (m, i) => m.recipeId !== regenerated.meals[i].recipeId,
    ),
  ).toHaveLength(1);
  await page.goto("/courses");
  await expect(page.locator(".shopping-row").first()).toBeVisible();
  const checkbox = page.locator(".shopping-row input").first();
  const was = await checkbox.isChecked();
  await page.locator(".shopping-row").first().click();
  await expect(checkbox).toBeChecked({ checked: !was });
  await expect(checkbox).toBeEnabled();
  await page.reload();
  await expect(page.locator(".shopping-row input").first()).toBeChecked({
    checked: !was,
  });
});
test("responsive : toutes les pages, sept largeurs, aucune image cassée ni débordement horizontal", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [360, 390, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/courses",
      "/recettes",
      "/favoris",
      "/reglages",
      "/historique",
    ]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${width}px ${route}`,
      ).toBe(true);
      await page.locator("main img").evaluateAll(async (images) => {
        await Promise.all(
          images.map(async (img) => {
            const image = img as HTMLImageElement;
            image.loading = "eager";
            try {
              await image.decode();
            } catch {
              /* L'assertion suivante relève les images cassées. */
            }
          }),
        );
      });
      expect(
        await page
          .locator("main img")
          .evaluateAll((images) =>
            images.every((img) => (img as HTMLImageElement).naturalWidth > 0),
          ),
      ).toBe(true);
    }
    await page.goto("/");
    await expect(page.locator(".meal-card")).toHaveCount(9);
    if (width === 390 || width === 1440) {
      await fs.mkdir(".local/qa", { recursive: true });
      await page.screenshot({
        path: `.local/qa/semaine-${width}.png`,
        fullPage: true,
      });
    }
  }
  expect(errors).toEqual([]);
});
test("impression A4 : menu et courses, navigation masquée et PDFs générés", async ({
  page,
}) => {
  await fs.mkdir(".local/qa", { recursive: true });
  for (const kind of ["semaine", "courses"]) {
    await page.goto(`/imprimer/${kind}?week=${week}`);
    await expect(page.locator(".print-sheet h1")).toBeVisible();
    if (kind === "courses")
      await expect(page.locator(".print-item").first()).toBeVisible();
    else await expect(page.locator(".print-days section")).toHaveCount(7);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".sidebar")).toBeHidden();
    await expect(page.locator(".print-controls")).toBeHidden();
    await page.pdf({
      path: `.local/qa/${kind}-a4.pdf`,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    await page.emulateMedia({ media: "screen" });
  }
});
test("PWA : manifest, worker et lecture du menu hors connexion après rechargement", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.locator(".meal-card")).toHaveCount(9);
  const manifest = await page.request
    .get("/manifest.webmanifest")
    .then((r) => r.json());
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.locator(".meal-card")).toHaveCount(9);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".meal-card")).toHaveCount(9);
  await expect(
    page.getByRole("status").filter({ hasText: "Hors connexion" }),
  ).toBeVisible();
  await context.setOffline(false);
});
