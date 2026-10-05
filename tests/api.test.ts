import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { once } from "node:events";
import type { Plan, ShoppingItem, Recipe } from "../shared/types.js";
// Schéma isolé : aucun repas du foyer de développement n'est modifié.
const schema = `qa_${Date.now()}`;
if (!/^qa_\d+$/.test(schema)) throw new Error("Schéma invalide");
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
process.env.FIREBASE_PROJECT_ID = "test-project";
process.env.LECLERC_INTEGRATION_ENABLED = "true";
process.env.DRIVE_PROVIDER_MODE = "mock";

process.env.NODE_ENV = "test";
execFileSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { env: process.env, stdio: "pipe" },
);
await import("../prisma/seed.js");
const { createApp } = await import("../server/app.js");
const { db } = await import("../server/db.js");
test("API PostgreSQL : authentification, génération, verrouillage, remplacement, courses et deux appareils", async () => {
  const server = createApp({ verifyToken: async(token) => { if (!["test-device1", "test-device2"].includes(token)) throw new Error("Token invalide"); return {uid:token,email:"family@example.test"}; } }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  let cookie = "";
  const request = async <T>(
    route: string,
    method = "GET",
    body?: unknown,
    authenticated = true,
  ) => {
    const res = await fetch(base + route, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "A-Table",
        ...(authenticated ? { Authorization: `Bearer ${cookie}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: res.status,
      data: (await res.json()) as T,
      headers: res.headers,
    };
  };
  try {
    assert.equal((await request("/api/health")).status, 200);
    assert.equal((await request("/api/recipes")).status, 401);
    const anonymous = await request<{
      authenticated: boolean;
      recipes?: Recipe[];
    }>("/api/bootstrap");
    assert.equal(anonymous.data.authenticated, false);
    assert.equal(anonymous.data.recipes, undefined);
    cookie = "invalid-token";
    assert.equal((await request("/api/recipes")).status, 401);
    cookie = "test-device1";
    const forbidden = await fetch(base + "/api/plans/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${cookie}`, "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(forbidden.status, 403);
    assert.equal((await request("/api/plans/2026-10-06")).status, 400);
    assert.equal((await request("/api/plans/2026-02-30")).status, 400);
    const catalog = await request<Recipe[]>("/api/recipes");
    assert.ok(catalog.data.length >= 50);
    const bootstrap = await request<{
      authenticated: boolean;
      recipes: Recipe[];
    }>("/api/bootstrap");
    assert.equal(bootstrap.data.authenticated, true);
    assert.equal(bootstrap.data.recipes.length, catalog.data.length);
    const week = "2026-10-05";
    const product = { name: "Café maison", quantity: 2, unit: "paquet", category: "Épicerie" };
    assert.equal((await request(`/api/shopping-list/${week}/items`, "POST", product, false)).status, 401);
    assert.equal((await request(`/api/shopping-list/${week}/items`, "POST", { ...product, quantity: 0 })).status, 400);
    assert.equal((await request(`/api/shopping-list/${week}/items`, "POST", { ...product, name: "   " })).status, 400);
    const manual = await request<ShoppingItem>(`/api/shopping-list/${week}/items`, "POST", product);
    assert.equal(manual.status, 201);
    assert.equal(manual.data.manual, true);
    const foreignHousehold = await db.household.create({ data: { name: "Autre foyer de test" } });
    const foreignPlan = await db.weeklyPlan.create({ data: { householdId: foreignHousehold.id, week, shoppingList: { create: { items: { create: { ...product, manual: true } } } } }, include: { shoppingList: { include: { items: true } } } });
    const foreignId = foreignPlan.shoppingList!.items[0].id;
    assert.equal((await request(`/api/shopping-list/items/${foreignId}`, "PUT", product)).status, 404);
    assert.equal((await request(`/api/shopping-list/items/${foreignId}`, "PATCH", { checked: true })).status, 404);
    assert.equal((await request(`/api/shopping-list/items/${foreignId}`, "DELETE")).status, 404);
    assert.ok(!(await request<ShoppingItem[]>(`/api/shopping-list/${week}`)).data.some(i => i.id === foreignId));
    const blank = (await request<Plan>(`/api/plans/${week}`)).data;
    assert.equal(blank.version, 0);
    assert.equal(blank.meals.length, 9);
    assert.ok(blank.meals.every(m => !m.recipeId));
    assert.equal((await request(`/api/shopping-list/${week}/items`, "POST", { ...product, name: " café   maison " })).status, 409);
    await request(`/api/shopping-list/items/${manual.data.id}`, "PATCH", { checked: true });
    let plan = (
      await request<Plan>("/api/plans/generate", "POST", { week, version: 0 })
    ).data;
    assert.equal(plan.meals.length, 9);
    assert.equal(new Set(plan.meals.map((m) => m.recipeId)).size, 9);
    assert.equal(
      (await request("/api/plans/generate", "POST", { week, version: 0 }))
        .status,
      409,
    );
    const locked = plan.meals[2];
    assert.equal(
      (
        await request(`/api/meals/${locked.id}/lock`, "PATCH", {
          locked: true,
          version: plan.version,
        })
      ).status,
      200,
    );
    plan = (await request<Plan>(`/api/plans/${week}`)).data;
    assert.equal(
      (
        await request(`/api/plans/${plan.id}/replace-meal`, "POST", {
          mealId: locked.id,
          version: plan.version,
        })
      ).status,
      423,
    );
    plan = (
      await request<Plan>("/api/plans/generate", "POST", {
        week,
        version: plan.version,
      })
    ).data;
    assert.equal(plan.meals[2].recipeId, locked.recipeId);
    assert.equal(plan.meals[2].locked, true);
    const initial = structuredClone(plan);
    const meal = plan.meals[0],
      choices = (await request<Recipe[]>(`/api/meals/${meal.id}/alternatives`))
        .data;
    assert.equal(choices.length, 3);
    plan = (
      await request<Plan>(`/api/plans/${plan.id}/replace-meal`, "POST", {
        mealId: meal.id,
        recipeId: choices[0].id,
        version: plan.version,
      })
    ).data;
    assert.equal(plan.meals[0].recipeId, choices[0].id);
    assert.deepEqual(plan.meals.slice(1), initial.meals.slice(1));
    const list = (await request<ShoppingItem[]>(`/api/shopping-list/${week}`))
      .data;
    assert.ok(list.length > 10);
    assert.ok(list.every((i) => i.quantity > 0));
    assert.equal(list.find(i => i.id === manual.data.id)?.checked, true);
    assert.equal(list.find(i => i.id === manual.data.id)?.quantity, 2);
    assert.equal((await request(`/api/shopping-list/items/${manual.data.id}`, "PUT", { ...product, quantity: 3 })).status, 200);
    assert.equal((await request<ShoppingItem[]>(`/api/shopping-list/${week}`)).data.find(i => i.id === manual.data.id)?.checked, false);
    const item = list.find(i => !i.manual)!;
    assert.equal((await request(`/api/shopping-list/items/${item.id}`, "PUT", product)).status, 403);
    assert.equal((await request(`/api/shopping-list/items/${item.id}`, "DELETE")).status, 403);
    // A manual supplement of an ingredient does not overwrite its calculated row.
    const sameIngredient = await request<ShoppingItem>(`/api/shopping-list/${week}/items`, "POST", { name: item.name, unit: item.unit, quantity: 1, category: "Autres" });
    assert.equal(sameIngredient.status, 201);
    assert.equal((await request(`/api/shopping-list/items/${sameIngredient.data.id}`, "PUT", product)).status, 409);
    assert.equal((await request(`/api/shopping-list/items/${sameIngredient.data.id}`, "DELETE")).status, 200);
    assert.equal(
      (
        await request(`/api/shopping-list/items/${item.id}`, "PATCH", {
          checked: true,
        })
      ).status,
      200,
    );
    const deviceCookie = "test-device2";
    const secondList = (await fetch(base + `/api/shopping-list/${week}`, {
      headers: { Authorization: `Bearer ${deviceCookie}` },
    }).then((r) => r.json())) as ShoppingItem[];
    assert.equal(secondList.find((i) => i.id === item.id)?.checked, true);
    assert.equal(secondList.find((i) => i.id === manual.data.id)?.quantity, 3);
    const fresh = (await fetch(base + `/api/plans/${week}`, {
      headers: { Authorization: `Bearer ${deviceCookie}` },
    }).then((r) => r.json())) as Plan;
    assert.deepEqual(fresh, plan);
    await request(`/api/favorites/${choices[0].id}`, "POST");
    assert.ok(
      (await request<string[]>("/api/favorites")).data.includes(choices[0].id),
    );
    await request(`/api/favorites/${choices[0].id}`, "DELETE");
    assert.equal((await request<string[]>("/api/favorites")).data.length, 0);
    const races = await Promise.all([
      request(`/api/meals/${plan.meals[1].id}/lock`, "PATCH", {
        locked: true,
        version: plan.version,
      }),
      request(`/api/meals/${plan.meals[3].id}/lock`, "PATCH", {
        locked: true,
        version: plan.version,
      }),
    ]);
    assert.deepEqual(races.map((r) => r.status).sort(), [200, 409]);
    assert.equal(
      (
        await request("/api/settings", "PATCH", {
          household: { adults: -1, children: [] },
        })
      ).status,
      400,
    );
    const settings = (
      await request<import("../shared/types.js").Settings>("/api/settings")
    ).data;
    const unsafeAllergy = catalog.data.find((r) => r.id === locked.recipeId)!
      .ingredients[0].name;
    assert.equal(
      (
        await request("/api/settings", "PATCH", {
          ...settings,
          exclusions: [unsafeAllergy],
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("/api/settings", "PATCH", {
          ...settings,
          household: { adults: 3, children: [{ age: 8 }] },
        })
      ).status,
      200,
    );
    assert.equal(
      (await request<import("../shared/types.js").Settings>("/api/settings"))
        .data.household.adults,
      3,
    );
    assert.equal((await request<ShoppingItem[]>(`/api/shopping-list/${week}`)).data.find(i => i.id === manual.data.id)?.quantity, 3);
    const draft={name:'Notre soupe maison',description:'Recette de test du foyer',preparationTime:10,cookingTime:20,servings:4,difficulty:'Facile',instructions:['Cuire les légumes.','Mixer.'],ingredients:[{name:'Carottes',quantity:400,unit:'g',category:'Fruits et légumes'}],seasons:['automne'],months:[9,10,11],allergens:[],vegetarian:true,childFriendly:true,protein:'légumes',starch:'aucun',light:true};
    const created=await request<Recipe>('/api/recipes','POST',draft);
    assert.equal(created.status,201);assert.equal(created.data.source,'custom');assert.equal(created.data.authorUid,'test-device1');
    assert.equal((await request(`/api/recipes/${created.data.id}`,'PUT',{...draft,name:'Soupe modifiée'})).status,200);
    assert.equal((await request(`/api/recipes/${catalog.data[0].id}`,'PUT',draft)).status,403);
    assert.equal((await request('/api/recipes','POST',{...draft,ingredients:[]})).status,400);
    const stores=(await request<import('../shared/drive.js').DriveStore[]>('/api/drive/leclerc/stores?q=69140')).data;
    assert.ok(stores[0].id.startsWith('demo-'));
    assert.equal((await request('/api/drive/leclerc/store','POST',{storeId:stores[0].id,query:'69140'})).status,200);
    const prepared=(await request<{id:string;proposals:import('../shared/drive.js').DriveProposal[]}>('/api/drive/leclerc/prepare','POST',{week})).data;
    assert.ok(prepared.proposals.some(p => p.ingredientId === manual.data.id));
    await request(`/api/shopping-list/items/${manual.data.id}`, "PUT", { ...product, quantity: 4 });
    assert.equal((await request('/api/drive/leclerc/prepare/confirm', 'POST', { id: prepared.id, items: [{ ingredientId: manual.data.id, productId: 'demo-test', quantity: 1 }] })).status, 409);
    const selected=prepared.proposals.filter(p=>p.productId).slice(0,2).map(p=>({ingredientId:p.ingredientId,productId:p.productId,quantity:p.quantity}));
    assert.ok(selected.length>0);
    const confirm={id:prepared.id,items:selected};
    assert.equal((await request('/api/drive/leclerc/prepare/confirm','POST',confirm)).status,202);
    assert.equal((await request('/api/drive/leclerc/prepare/confirm','POST',confirm)).status,202);
    let job:import('../shared/drive.js').DriveJob;
    for(let n=0;n<100;n++){job=(await request<import('../shared/drive.js').DriveJob>(`/api/drive/leclerc/jobs/${prepared.id}`)).data;if(job.status!=='adding_to_cart')break;await new Promise(r=>setTimeout(r,20));}
    assert.equal(job!.status,'completed');assert.equal(job!.success,selected.length);
    const driveCart=(await request<import('../shared/drive.js').DriveCart>('/api/drive/leclerc/cart')).data;
    assert.equal(driveCart.totalItems,selected.reduce((s,i)=>s+i.quantity,0));
    const driveItem=driveCart.items[0];
    assert.equal((await request(`/api/drive/leclerc/cart/items/${driveItem.productId}`,'PATCH',{quantity:2})).status,200);
    assert.equal((await request(`/api/drive/leclerc/cart/items/${driveItem.productId}`,'DELETE')).status,200);
    assert.equal((await request(`/api/shopping-list/items/${manual.data.id}`, "DELETE")).status, 200);
    assert.ok(!(await request<ShoppingItem[]>(`/api/shopping-list/${week}`)).data.some(i => i.id === manual.data.id));
    assert.equal((await request(`/api/shopping-list/items/${manual.data.id}`, "PUT", product)).status, 404);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await db.$disconnect();
  }
});
