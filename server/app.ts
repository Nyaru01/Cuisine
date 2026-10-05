import express from "express";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import { z, ZodError } from "zod";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db, familyWrite } from "./db.js";
import {
  getRecipes,
  getSettings,
  getPlan,
  getShopping,
  ensurePlan,
  selectionContext,
  saveMeals,
  assertVersion,
  saveSettings,
  ApiError,
} from "./services.js";
import {
  monday,
  parisToday,
  generateMeals,
  alternatives,
  compatible,
} from "../shared/domain.js";
import type { Meal } from "../shared/types.js";
import {
  requireAuth,
  protectWrites,
  authEnabled,
  authenticate,
  authConfig,
  type TokenVerifier,
} from "./firebase-auth.js";
import { saveRecipe } from "./recipes.js";
import { driveRouter } from "./drive/routes.js";
const weekSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const date = new Date(`${s}T12:00Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === s &&
      monday(s) === s
    );
  }, "La date doit être un lundi valide.");
const version = z.number().int().min(0);
const settingsSchema = z.object({
  household: z.object({
    adults: z.number().int().min(1).max(10),
    children: z
      .array(z.object({ age: z.number().int().min(0).max(17) }))
      .max(10),
  }),
  maxPrep: z.number().int().min(10).max(90),
  dislikes: z.array(z.string().trim().min(2).max(80)).max(50),
  exclusions: z.array(z.string().trim().min(2).max(80)).max(50),
  allergies: z
    .array(
      z.enum([
        "gluten",
        "lait",
        "œufs",
        "poisson",
        "soja",
        "moutarde",
        "céleri",
        "sésame",
        "fruits à coque",
        "arachides",
        "crustacés",
        "mollusques",
        "lupin",
        "sulfites",
      ]),
    )
    .max(14),
});
export function createApp(options: { verifyToken?: TokenVerifier } = {}) {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(compression());
  app.use(
    helmet({
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      contentSecurityPolicy:
        process.env.NODE_ENV === "production"
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "https://apis.google.com"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:"],
                connectSrc: ["'self'", "https://*.googleapis.com", "https://*.firebaseapp.com"],
                frameSrc: ["https://*.firebaseapp.com", "https://accounts.google.com"],
                fontSrc: ["'self'"],
                workerSrc: ["'self'"],
                objectSrc: ["'none'"],
              },
            }
          : false,
    }),
  );
  app.use(express.json({ limit: "256kb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.get("/api/health", async (_req, res) => {
    try {
      const [recipes, household] = await Promise.all([
        db.recipe.count(),
        db.household.findUnique({ where: { id: "family" }, select: { id: true } }),
      ]);
      if (recipes === 0 || !household)
        return res.status(503).json({ status: "database-not-initialized" });
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "database-unavailable" });
    }
  });
  app.use("/api", protectWrites);
  app.get("/api/auth/config", (_req,res)=>res.json({...authConfig(),enabled:authEnabled}));
  app.use('/api',rateLimit({windowMs:60000,limit:300,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Trop de requêtes. Réessayez dans une minute.'}}));
  app.use("/api", authenticate(options.verifyToken));
  app.get("/api/auth", (_req, res) =>
    res.json({
      enabled: authEnabled,
      authenticated: res.locals.authenticated,
    }),
  );
  app.get("/api/bootstrap", async (_req, res) => {
    const authenticated = res.locals.authenticated;
    if (!authenticated)
      return res.json({ enabled: authEnabled, authenticated: false });
    const [recipes, settings, favorites, plan] = await Promise.all([
      getRecipes(),
      getSettings(),
      db.favorite.findMany({ where: { householdId: "family" } }),
      getPlan(monday()),
    ]);
    res.json({
      enabled: authEnabled,
      authenticated: true,
      driveEnabled: process.env.LECLERC_INTEGRATION_ENABLED === "true",
      recipes,
      settings,
      favorites: favorites.map((f) => f.recipeId),
      plan,
    });
  });
  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie("session").json({ authenticated: false });
  });
  app.use("/api", requireAuth);
  app.use('/api/drive/leclerc',driveRouter());
  app.get("/api/recipes", async (_req, res) => res.json(await getRecipes()));
  app.post("/api/recipes", async(req,res)=>res.status(201).json(await saveRecipe(req.body,res.locals.identity.uid)));
  app.put("/api/recipes/:id", async(req,res)=>res.json(await saveRecipe(req.body,res.locals.identity.uid,String(req.params.id))));
  app.get("/api/recipes/:id", async (req, res) => {
    const recipe = (await getRecipes()).find((r) => r.id === req.params.id);
    if (!recipe) throw new ApiError(404, "Recette introuvable.");
    res.json(recipe);
  });
  app.get("/api/settings", async (_req, res) => res.json(await getSettings()));
  app.patch("/api/settings", async (req, res) => {
    const settings = settingsSchema.parse(req.body);
    await familyWrite((tx) => saveSettings(settings, tx));
    res.json(await getSettings());
  });
  app.get("/api/plans/current", async (_req, res) =>
    res.json(await getPlan(monday(parisToday()))),
  );
  app.get("/api/plans/:week", async (req, res) =>
    res.json(await getPlan(weekSchema.parse(req.params.week))),
  );
  app.post("/api/plans/generate", async (req, res) => {
    const body = z.object({ week: weekSchema, version }).parse(req.body);
    await familyWrite(async (tx) => {
      const plan = await ensurePlan(body.week, body.version, tx);
      const context = await selectionContext(body.week, tx);
      const recipes = await getRecipes(tx);
      if (plan.meals.filter((m) => !m.locked).length === 0)
        throw new ApiError(
          409,
          "Tous les repas sont verrouillés. Déverrouillez un repas pour régénérer.",
        );
      let meals: Meal[];
      try {
        meals = generateMeals(recipes, plan.meals as Meal[], {
          ...context,
          salt: randomUUID(),
        });
      } catch (error) {
        throw new ApiError(
          422,
          error instanceof Error ? error.message : "Génération impossible.",
        );
      }
      await saveMeals(plan.id, meals, tx);
    });
    res.json(await getPlan(body.week));
  });
  app.get("/api/meals/:id/alternatives", async (req, res) => {
    const meal = await db.mealSlot.findFirst({
      where: { id: String(req.params.id), plan: { householdId: "family" } },
      include: { plan: { include: { meals: true } } },
    });
    if (!meal) throw new ApiError(404, "Repas introuvable.");
    if (meal.locked)
      throw new ApiError(423, "Déverrouillez ce repas pour le changer.");
    const context = await selectionContext(meal.plan.week, db),
      recipes = await getRecipes();
    const others = meal.plan.meals
      .filter((m) => m.id !== meal.id)
      .map((m) => recipes.find((r) => r.id === m.recipeId)!)
      .filter(Boolean);
    res.json(
      alternatives(
        recipes,
        {
          ...context,
          slot: meal as Meal,
          others,
          salt: `${meal.plan.id}:${meal.plan.version}`,
        },
        meal.recipeId,
      ),
    );
  });
  app.post("/api/plans/:planId/replace-meal", async (req, res) => {
    const body = z
      .object({ mealId: z.string(), recipeId: z.string().optional(), version })
      .parse(req.body);
    const week = await familyWrite(async (tx) => {
      const plan = await tx.weeklyPlan.findFirst({
        where: { id: String(req.params.planId), householdId: "family" },
        include: { meals: { orderBy: [{ date: "asc" }, { period: "asc" }] } },
      });
      if (!plan) throw new ApiError(404, "Semaine introuvable.");
      assertVersion(plan.version, body.version);
      const meal = plan.meals.find((m) => m.id === body.mealId);
      if (!meal) throw new ApiError(404, "Repas introuvable.");
      if (meal.locked)
        throw new ApiError(423, "Déverrouillez ce repas pour le changer.");
      const context = await selectionContext(plan.week, tx),
        recipes = await getRecipes(tx);
      const others = plan.meals
        .filter((m) => m.id !== meal.id)
        .map((m) => recipes.find((r) => r.id === m.recipeId)!)
        .filter(Boolean);
      const choices = alternatives(
        recipes,
        {
          ...context,
          slot: meal as Meal,
          others,
          salt: `${plan.id}:${plan.version}`,
        },
        meal.recipeId,
      );
      const selected = body.recipeId
        ? choices.find((r) => r.id === body.recipeId)
        : choices[0];
      if (!selected || !compatible(selected, context.settings))
        throw new ApiError(
          422,
          "Cette alternative n’est plus disponible. Actualisez les propositions.",
        );
      await saveMeals(
        plan.id,
        [
          {
            ...meal,
            period: meal.period as Meal["period"],
            recipeId: selected.id,
          },
        ],
        tx,
      );
      return plan.week;
    });
    res.json(await getPlan(week));
  });
  app.patch("/api/meals/:id/lock", async (req, res) => {
    const body = z.object({ locked: z.boolean(), version }).parse(req.body);
    await familyWrite(async (tx) => {
      const meal = await tx.mealSlot.findFirst({
        where: { id: String(req.params.id), plan: { householdId: "family" } },
        include: { plan: true },
      });
      if (!meal?.recipeId) throw new ApiError(404, "Générez d’abord ce repas.");
      assertVersion(meal.plan.version, body.version);
      if (body.locked) {
        const recipe = (await getRecipes(tx)).find(
          (r) => r.id === meal.recipeId,
        );
        if (recipe && !compatible(recipe, await getSettings(tx)))
          throw new ApiError(
            422,
            "Ce repas ne correspond plus à vos exclusions. Remplacez-le avant de le verrouiller.",
          );
      }
      await tx.mealSlot.update({
        where: { id: meal.id },
        data: { locked: body.locked },
      });
      await tx.weeklyPlan.update({
        where: { id: meal.planId },
        data: { version: { increment: 1 } },
      });
    });
    res.json({ ok: true });
  });
  app.get("/api/shopping-list/:week", async (req, res) =>
    res.json(await getShopping(weekSchema.parse(req.params.week))),
  );
  app.patch("/api/shopping-list/items/:id", async (req, res) => {
    const body = z.object({ checked: z.boolean() }).parse(req.body);
    await familyWrite(async (tx) => {
      const item = await tx.shoppingListItem.findFirst({
        where: {
          id: String(req.params.id),
          list: { plan: { householdId: "family" } },
        },
      });
      if (!item) throw new ApiError(404, "Article introuvable.");
      await tx.shoppingListItem.update({ where: { id: item.id }, data: body });
    });
    res.json({ ok: true });
  });
  app.get("/api/favorites", async (_req, res) =>
    res.json(
      (await db.favorite.findMany({ where: { householdId: "family" } })).map(
        (f) => f.recipeId,
      ),
    ),
  );
  app.post("/api/favorites/:recipeId", async (req, res) => {
    const recipeId = String(req.params.recipeId);
    if (!(await db.recipe.findUnique({ where: { id: recipeId } })))
      throw new ApiError(404, "Recette introuvable.");
    await db.favorite.upsert({
      where: { householdId_recipeId: { householdId: "family", recipeId } },
      create: { householdId: "family", recipeId },
      update: {},
    });
    res.json({ ok: true });
  });
  app.delete("/api/favorites/:recipeId", async (req, res) => {
    await db.favorite.deleteMany({
      where: { householdId: "family", recipeId: String(req.params.recipeId) },
    });
    res.json({ ok: true });
  });
  app.get("/api/history", async (_req, res) => {
    const plans = await db.weeklyPlan.findMany({
      where: {
        householdId: "family",
        week: { lt: monday() },
        meals: { some: { recipeId: { not: null } } },
      },
      include: { meals: { orderBy: [{ date: "asc" }, { period: "asc" }] } },
      orderBy: { week: "desc" },
    });
    res.json(plans.map((p) => ({ week: p.week, meals: p.meals })));
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Route introuvable." }),
  );
  const publicPath = path.resolve("dist");
  app.use(
    express.static(publicPath, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`))
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        if (filePath.endsWith("sw.js") || filePath.endsWith(".webmanifest"))
          res.setHeader("Cache-Control", "no-cache");
      },
    }),
  );
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(publicPath, "index.html")),
  );
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      void _next;
      if (error instanceof ZodError)
        return res
          .status(400)
          .json({ error: error.issues.map((i) => i.message).join(" ") });
      if (error instanceof ApiError)
        return res.status(error.status).json({ error: error.message });
      if (error instanceof SyntaxError)
        return res
          .status(400)
          .json({ error: "Le corps de la requête est invalide." });
      console.error(
        error instanceof Error
          ? error.message.replace(
              /postgres(?:ql)?:\/\/\S+/g,
              "[connexion masquée]",
            )
          : "Erreur interne",
      );
      res
        .status(500)
        .json({ error: "Une erreur est survenue. Réessayez dans un instant." });
    },
  );
  return app;
}
