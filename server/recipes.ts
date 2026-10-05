import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, familyWrite } from "./db.js";
import { normalize } from "../shared/domain.js";
import { ApiError, getRecipes, getSettings, reconcileShopping } from "./services.js";
import { monday, compatible } from "../shared/domain.js";
const text = z.string().trim().min(1).max(160);
export const recipeSchema = z.object({
  name: text, description: z.string().trim().min(1).max(1500),
  preparationTime: z.number().int().min(0).max(1440), cookingTime: z.number().int().min(0).max(1440),
  servings: z.number().int().min(1).max(30), difficulty: z.enum(["Facile", "Moyen", "Difficile"]),
  instructions: z.array(z.string().trim().min(1).max(2500)).min(1).max(50),
  ingredients: z.array(z.object({name: text,quantity:z.number().positive().max(100000),unit:z.enum(["g","kg","ml","l","pièce","tranche"]),category:text})).min(1).max(80),
  seasons: z.array(z.enum(["hiver","printemps","été","automne"])).min(1),
  months:z.array(z.number().int().min(1).max(12)).min(1).max(12),
  allergens:z.array(text).max(20), vegetarian:z.boolean(), childFriendly:z.boolean(),
  protein:text, starch:text, light:z.boolean(),
}).superRefine((r,ctx)=>{
  const keys=r.ingredients.map(i=>`${normalize(i.name)}:${i.unit}`);
  if(new Set(keys).size!==keys.length)ctx.addIssue({code:"custom",path:["ingredients"],message:"Regroupez les ingrédients identiques dans une seule ligne."});
});
export async function saveRecipe(body:unknown,uid:string,id?:string){
  const draft=recipeSchema.parse(body);
  const recipeId=id??`custom-${randomUUID()}`;
  await familyWrite(async(tx)=>{
    if(id){
      const current=await tx.recipe.findUnique({where:{id}});
      if(!current||current.source!=="custom")throw new ApiError(403,"Seules les recettes du foyer peuvent être modifiées.");
    }
    const {ingredients,...data}=draft;
    data.allergens=data.allergens.map(normalize);
    await tx.recipe.upsert({where:{id:recipeId},create:{...data,id:recipeId,source:"custom",authorUid:uid,totalTime:data.preparationTime+data.cookingTime,image:"/images/harvest.svg",categories:["Recette du foyer"],style:"familial"},update:{...data,totalTime:data.preparationTime+data.cookingTime}});
    await tx.recipeIngredient.deleteMany({where:{recipeId}});
    for(const i of ingredients){
      const ingredientId=`${normalize(i.name)}:${i.unit}`;
      await tx.ingredient.upsert({where:{id:ingredientId},create:{id:ingredientId,name:i.name,unit:i.unit,category:i.category},update:{}});
      await tx.recipeIngredient.create({data:{recipeId,ingredientId,quantity:i.quantity}});
    }
    if(id){
      const plans=await tx.weeklyPlan.findMany({where:{week:{gte:monday()},meals:{some:{recipeId}}}});
      const updated=(await getRecipes(tx)).find(r=>r.id===recipeId)!;
      const locked=await tx.mealSlot.count({where:{recipeId,locked:true,plan:{week:{gte:monday()}}}});
      if(locked&&!compatible(updated,await getSettings(tx)))throw new ApiError(409,'Une exclusion concerne cette recette verrouillée. Déverrouillez les repas concernés avant de la modifier.');
      for(const plan of plans){await reconcileShopping(plan.id,tx);await tx.weeklyPlan.update({where:{id:plan.id},data:{version:{increment:1}}});}
    }
  });
  return (await getRecipes(db)).find(r=>r.id===recipeId)!;
}
