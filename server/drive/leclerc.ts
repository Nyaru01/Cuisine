import { z } from "zod";
import type {DriveStore,DriveProduct,DriveCart} from "../../shared/drive.js";
import {DriveProviderError,type DriveProvider} from './provider.js';
const storeSchema=z.object({id:z.string(),name:z.string(),serviceType:z.enum(['drive','relais','livraison']),city:z.string().optional(),postalCode:z.string().optional(),host:z.string().regex(/^fd\d+-courses\.leclercdrive\.fr$/).optional()});
const productSchema=z.object({id:z.string(),name:z.string(),price:z.number().nonnegative(),available:z.boolean(),packQuantity:z.number().positive(),packUnit:z.string(),brand:z.string().optional()});
const cartSchema=z.object({items:z.array(z.object({productId:z.string(),name:z.string(),quantity:z.number().int().nonnegative(),unitPrice:z.number().nonnegative(),totalPrice:z.number().nonnegative()})),totalItems:z.number(),totalPrice:z.number(),updatedAt:z.string()});
// Le navigateur et les sessions sont détenus par un worker séparé. Aucun cookie ne traverse Cuisine.
export class LeclercProvider implements DriveProvider {
  mode='live' as const;private failures=0;private openedUntil=0;private queue:Promise<unknown>=Promise.resolve();private last=0;
  private call<T>(operation:string,body:unknown,schema:z.ZodType<T>):Promise<T>{
    const task=async()=>{
      if(operation!=='get_store'&&Date.now()<this.openedUntil)throw new DriveProviderError('CIRCUIT_OPEN','E.Leclerc est temporairement indisponible. Votre liste reste disponible.');
      const endpoint=process.env.LECLERC_CONNECTOR_URL,token=process.env.LECLERC_CONNECTOR_TOKEN;
      if(!endpoint||!token)throw new DriveProviderError('CONNECTOR_REQUIRED','Connectez le worker Leclerc et sa session pour utiliser le catalogue réel.');
      const wait=Math.max(0,Number(process.env.LECLERC_REQUEST_DELAY_MS||1200)-(Date.now()-this.last));await new Promise(r=>setTimeout(r,wait));this.last=Date.now();
      const started=Date.now();
      try{
        const response=await fetch(new URL(`/operations/${operation}`,endpoint),{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(Number(process.env.LECLERC_REQUEST_TIMEOUT_MS||15000))});
        if(response.status===409){const issue=await response.json() as {error?:unknown};throw new DriveProviderError('BROWSER_SETUP',typeof issue.error==='string'?issue.error:'Ouvrez le magasin dans le Chrome dédié.',409);}
        if(!response.ok)throw new DriveProviderError(response.status===401||response.status===403?'AUTH_REQUIRED':response.status===429?'RATE_LIMIT':'UNAVAILABLE',response.status===401||response.status===403?'Reconnectez votre session sur le worker Leclerc.':'Le service Leclerc est indisponible.',response.status===401||response.status===403?409:503);
        let data:unknown;
        try{data=await response.json();}catch{throw new DriveProviderError('PROVIDER_CHANGED','Le format Leclerc a changé. Le connecteur doit être vérifié.');}
        const parsed=schema.safeParse(data);if(!parsed.success)throw new DriveProviderError('PROVIDER_CHANGED','Le format Leclerc a changé. Le connecteur doit être vérifié.');
        if(operation!=='get_store')this.failures=0;console.info(JSON.stringify({provider:'leclerc',operation,durationMs:Date.now()-started,success:true}));return parsed.data;
      }catch(error){if(!(error instanceof DriveProviderError&&['BROWSER_SETUP','AUTH_REQUIRED'].includes(error.code))&&++this.failures>=3)this.openedUntil=Date.now()+60000;console.warn(JSON.stringify({provider:'leclerc',operation,durationMs:Date.now()-started,success:false}));if(error instanceof DriveProviderError)throw error;throw new DriveProviderError('TIMEOUT','Le connecteur Leclerc ne répond pas. Réessayez plus tard.');}
    };
    const next=this.queue.then(task,task);this.queue=next.catch(()=>{});return next;
  }
  findStores(query:string):Promise<DriveStore[]>{return this.call('find_stores',{query},z.array(storeSchema));}
  setStore(storeId:string):Promise<DriveStore>{return this.call('set_store',{storeId},storeSchema);}
  getStore():Promise<DriveStore|null>{return this.call('get_store',{},storeSchema.nullable());}
  searchProducts(query:string):Promise<DriveProduct[]>{return this.call('search_product',{query},z.array(productSchema));}
  getCart():Promise<DriveCart>{return this.call('get_cart',{},cartSchema);}
  addToCart(productId:string,quantity:number){return this.call('add_to_cart',{productId,quantity},cartSchema);}
  updateQuantity(productId:string,quantity:number){return this.call('update_quantity',{productId,quantity},cartSchema);}
  removeFromCart(productId:string){return this.call('remove_from_cart',{productId},cartSchema);}
}
