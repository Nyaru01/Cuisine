import { db, familyWrite } from "../db.js";
import { RECIPES } from "../../shared/recipes.js";
import { normalize } from "../../shared/domain.js";
import type { DriveStore,DriveProduct,DriveCart,DriveCartItem } from "../../shared/drive.js";
import { DriveProviderError,type DriveProvider } from "./provider.js";
// Fixtures de test exclusivement : aucun nom commercial, prix ou stock Leclerc réel.
const ingredients=[...new Map(RECIPES.flatMap(r=>r.ingredients).map(i=>[normalize(i.name),i])).values()];
export const mockProducts:DriveProduct[]=ingredients.flatMap((i,n)=>[1,2].map(size=>({id:`demo-${n}-${size}`,name:`${i.name} — format test ${size}`,price:Number(((n%9+3)*0.37*size).toFixed(2)),available:n%17!==0||size===2,packQuantity:i.unit==='g'?250*size:i.unit==='ml'?500*size:i.unit==='pièce'?6*size:i.unit==='tranche'?4*size:i.quantity*size,packUnit:i.unit,brand:'Démonstration'})));
function cart(items:DriveCartItem[]):DriveCart{return {items,totalItems:items.reduce((s,i)=>s+i.quantity,0),totalPrice:Number(items.reduce((s,i)=>s+i.totalPrice,0).toFixed(2)),updatedAt:new Date().toISOString()};}
async function state(){return db.driveState.upsert({where:{id:'family-mock'},create:{id:'family-mock',mode:'mock'},update:{}});}
export class MockLeclercProvider implements DriveProvider {
  mode='mock' as const;
  async findStores(query:string):Promise<DriveStore[]>{return [{id:`demo-${normalize(query).replaceAll(' ','-')}`,name:`Drive de démonstration — ${query}`,city:query,serviceType:'drive'}];}
  async setStore(storeId:string){const city=storeId.replace(/^demo-/,'').replaceAll('-',' ');const store:DriveStore={id:storeId,name:`Drive de démonstration — ${city}`,city,serviceType:'drive'};await state();await db.driveState.update({where:{id:'family-mock'},data:{store:{...store},cart:[]}});return store;}
  async getStore(){return (await state()).store as unknown as DriveStore|null;}
  async searchProducts(query:string){const terms=normalize(query).split(' ').filter(t=>t.length>2);return mockProducts.filter(p=>terms.some(t=>normalize(p.name).includes(t))).slice(0,10);}
  async getCart(){return cart((await state()).cart as unknown as DriveCartItem[]);}
  private async write(id:string,quantity:number,add:boolean){
    const product=mockProducts.find(p=>p.id===id);if(!product)throw new DriveProviderError('PRODUCT_NOT_FOUND','Produit de test introuvable.',404);
    if(quantity>0&&!product.available)throw new DriveProviderError('PRODUCT_UNAVAILABLE','Produit indisponible.',409);
    await state();
    return familyWrite(async tx=>{const row=await tx.driveState.findUniqueOrThrow({where:{id:'family-mock'}});const items=row.cart as unknown as DriveCartItem[];const previous=items.find(i=>i.productId===id);const count=add?(previous?.quantity??0)+quantity:quantity;const updated=items.filter(i=>i.productId!==id);if(count>0)updated.push({productId:id,name:product.name,quantity:count,unitPrice:product.price,totalPrice:Number((product.price*count).toFixed(2))});await tx.driveState.update({where:{id:'family-mock'},data:{cart:updated.map(i=>({...i}))}});return cart(updated);});
  }
  addToCart(id:string,quantity:number){return this.write(id,quantity,true);}
  updateQuantity(id:string,quantity:number){return this.write(id,quantity,false);}
  removeFromCart(id:string){return this.write(id,0,false);}
}
