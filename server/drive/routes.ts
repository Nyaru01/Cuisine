import { Router } from "express";
import { z } from "zod";
import { db,familyWrite } from "../db.js";
import { ApiError,getShopping,getPlan } from "../services.js";
import {normalize} from "../../shared/domain.js";
import type {DriveProduct,DriveProposal} from "../../shared/drive.js";
import {MockLeclercProvider} from './mock.js';
import {LeclercProvider} from './leclerc.js';
import {DriveProviderError} from './provider.js';
import {packsNeeded,scoreProduct,searchTerms} from './matcher.js';
const query=z.string().trim().min(2).max(120),quantity=z.number().int().min(0).max(100);
export function driveRouter(){
  const router=Router(),provider=process.env.DRIVE_PROVIDER_MODE==='live'?new LeclercProvider():new MockLeclercProvider();
  const cache=new Map<string,{expires:number;products:DriveProduct[]}>();
  const active=new Set<string>();
  async function products(q:string){const store=await provider.getStore();if(!store)throw new ApiError(409,'Sélectionnez un Drive.');const key=`${store.id}:${normalize(q)}`;const cached=cache.get(key);if(cached&&cached.expires>Date.now())return cached.products;const items=await provider.searchProducts(q);if(cache.size>200)cache.clear();cache.set(key,{expires:Date.now()+600000,products:items});return items;}
  router.use((_req,res,next)=>{if(process.env.LECLERC_INTEGRATION_ENABLED!=='true')return res.status(404).json({error:'Intégration Drive désactivée.'});next();});
  router.get('/status',async(_req,res)=>res.json({enabled:true,mode:provider.mode,store:await provider.getStore(),connected:provider.mode==='mock'||Boolean(process.env.LECLERC_CONNECTOR_URL)}));
  router.get('/stores',async(req,res)=>res.json(await provider.findStores(query.parse(req.query.q))));
  router.post('/store',async(req,res)=>{if(active.size)throw new ApiError(409,'Attendez la fin de la préparation du panier.');const {storeId}=z.object({storeId:z.string().min(1).max(160)}).parse(req.body);const stores=await provider.findStores(query.parse(req.body.query));if(!stores.some(s=>s.id===storeId))throw new ApiError(400,'Choisissez un Drive de la recherche.');res.json(await provider.setStore(storeId));});
  router.get('/products',async(req,res)=>res.json(await products(query.parse(req.query.q))));
  router.get('/cart',async(_req,res)=>res.json(await provider.getCart()));
  router.post('/cart/items',async(req,res)=>{const body=z.object({productId:z.string().min(1),quantity:quantity.refine(n=>n>0)}).parse(req.body);res.json(await provider.addToCart(body.productId,body.quantity));});
  router.patch('/cart/items/:id',async(req,res)=>{if(active.size)throw new ApiError(409,'Attendez la fin des ajouts.');res.json(await provider.updateQuantity(String(req.params.id),quantity.parse(req.body.quantity)));});
  router.delete('/cart/items/:id',async(req,res)=>{if(active.size)throw new ApiError(409,'Attendez la fin des ajouts.');res.json(await provider.removeFromCart(String(req.params.id)));});
  router.post('/prepare',async(req,res)=>{
    const {week}=z.object({week:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).parse(req.body);
    const store=await provider.getStore();if(!store)throw new ApiError(409,'Sélectionnez votre Drive.');
    const plan=await getPlan(week),items=(await getShopping(week)).filter(i=>!i.checked),proposals:DriveProposal[]=[];
    if(!items.length)throw new ApiError(409,'Aucun article restant dans cette liste.');
    const preferences=await db.ingredientProductPreference.findMany({where:{storeId:store.id}});
    for(const item of items){
      let choices:DriveProduct[]=[];
      for(const term of searchTerms(item.name)){choices=await products(term);if(choices.some(p=>Number.isFinite(scoreProduct(item,p))))break;}
      const ranked=choices.map(product=>({product,score:scoreProduct(item,product,preferences.some(p=>p.ingredient===normalize(item.name)&&p.productId===product.id))})).filter(p=>Number.isFinite(p.score)).sort((a,b)=>b.score-a.score).map(p=>p.product).slice(0,5);
      const first=ranked[0];proposals.push({ingredientId:item.id,ingredient:item.name,needed:item.quantity,unit:item.unit,products:ranked,productId:first?.id??null,quantity:first?(packsNeeded(item,first)??1):1,reason:first?'Format et disponibilité adaptés':'Aucune correspondance assez sûre. À vérifier.'});
    }
    const job=await db.driveSyncJob.create({data:{mode:provider.mode,storeId:store.id,week,planVersion:plan.version,status:'waiting_confirmation',proposals:JSON.parse(JSON.stringify(proposals)),total:proposals.length,failures:[]}});
    res.json({id:job.id,mode:provider.mode,proposals});
  });
  router.post('/prepare/confirm',async(req,res)=>{
    const body=z.object({id:z.string(),items:z.array(z.object({ingredientId:z.string(),productId:z.string(),quantity:quantity.refine(n=>n>0)})).min(1).max(100)}).parse(req.body);
    const store=await provider.getStore();
    let launch=false;
    const job=await familyWrite(async tx=>{
      const row=await tx.driveSyncJob.findUnique({where:{id:body.id}});if(!row||row.mode!==provider.mode)throw new ApiError(404,'Proposition introuvable.');
      if(row.status!=='waiting_confirmation')return row;
      if(active.size)throw new ApiError(409,'Un panier est déjà en préparation.');
      if(row.storeId!==store?.id||(await getPlan(row.week,tx)).version!==row.planVersion)throw new ApiError(409,'Le Drive ou le menu a changé. Préparez une nouvelle proposition.');
      const proposals=row.proposals as unknown as DriveProposal[];
      if(new Set(body.items.map(i=>i.ingredientId)).size!==body.items.length||body.items.some(i=>!proposals.some(p=>p.ingredientId===i.ingredientId)))throw new ApiError(400,'Lignes de proposition invalides.');
      const currentItems=await getShopping(row.week,tx);
      if(body.items.some(selected=>{
        const proposal=proposals.find(p=>p.ingredientId===selected.ingredientId)!;
        const item=currentItems.find(i=>i.id===selected.ingredientId);
        return !item||item.checked||item.name!==proposal.ingredient||item.quantity!==proposal.needed||item.unit!==proposal.unit;
      }))throw new ApiError(409,'La liste de courses a changé. Préparez une nouvelle proposition.');
      launch=true;
      return tx.driveSyncJob.update({where:{id:row.id},data:{status:'adding_to_cart',total:body.items.length}});
    });
    if(launch){
      active.add(job.id);
      void (async()=>{
        for(const item of body.items){
          try{await provider.addToCart(item.productId,item.quantity);const proposal=(job.proposals as unknown as DriveProposal[]).find(p=>p.ingredientId===item.ingredientId)!;await db.ingredientProductPreference.upsert({where:{ingredient_storeId_productId:{ingredient:normalize(proposal.ingredient),storeId:job.storeId,productId:item.productId}},create:{ingredient:normalize(proposal.ingredient),storeId:job.storeId,productId:item.productId},update:{selectionCount:{increment:1}}});await db.driveSyncJob.update({where:{id:job.id},data:{processed:{increment:1},success:{increment:1}}});}
          catch(error){await db.driveSyncJob.update({where:{id:job.id},data:{processed:{increment:1},failures:{push:error instanceof DriveProviderError?error.message:'Un produit reste à vérifier.'}}});}
        }
        const final=await db.driveSyncJob.findUniqueOrThrow({where:{id:job.id}});await db.driveSyncJob.update({where:{id:job.id},data:{status:final.failures.length?'partial':'completed'}});
      })().catch(async()=>{await db.driveSyncJob.update({where:{id:job.id},data:{status:'failed',failures:{push:'Préparation interrompue. Vérifiez le panier avant de recommencer.'}}});}).finally(()=>active.delete(job.id));
    }
    res.status(202).json(job);
  });
  router.get('/jobs/:id',async(req,res)=>{let job=await db.driveSyncJob.findUnique({where:{id:String(req.params.id)}});if(!job||job.mode!==provider.mode)throw new ApiError(404,'Préparation introuvable.');if(job.status==='adding_to_cart'&&!active.has(job.id))job=await db.driveSyncJob.update({where:{id:job.id},data:{status:'failed',failures:{push:'Le service a redémarré. Vérifiez le panier avant de recommencer.'}}});res.json(job);});
  router.use((error:unknown,_req:import('express').Request,res:import('express').Response,next:import('express').NextFunction)=>{if(error instanceof DriveProviderError)return res.status(error.status).json({error:error.message,code:error.code});next(error);});
  return router;
}
