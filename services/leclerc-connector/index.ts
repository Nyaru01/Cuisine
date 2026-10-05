import 'dotenv/config';
import express from 'express';
import {timingSafeEqual} from 'node:crypto';
import fs from 'node:fs/promises';
import {z} from 'zod';
import type {DriveStore} from '../../shared/drive.js';
import {BrowserAdapter,BrowserSetupError} from './cdp.js';
import {parseProducts,parseCart} from './parser.js';
const token=process.env.LECLERC_CONNECTOR_TOKEN??'';
if(token.length<32)throw new Error('LECLERC_CONNECTOR_TOKEN doit contenir au moins 32 caractères.');
const app=express(),browser=new BrowserAdapter(),stateFile=process.env.LECLERC_STATE_FILE??'.local/leclerc-store.json';
let store:DriveStore|null=null,stores:DriveStore[]=[];
try{store=JSON.parse(await fs.readFile(stateFile,'utf8'));}catch{/* premier démarrage */}
let queue:Promise<unknown>=Promise.resolve(),last=0;
app.use(express.json({limit:'16kb'}));
app.use((req,res,next)=>{const candidate=(req.get('Authorization')??'').replace(/^Bearer /,'');if(candidate.length!==token.length||!timingSafeEqual(Buffer.from(candidate),Buffer.from(token)))return res.sendStatus(401);next();});
async function request(url:string,body?:string){
  await new Promise(r=>setTimeout(r,Math.max(0,Number(process.env.LECLERC_REQUEST_DELAY_MS??1200)-(Date.now()-last))));last=Date.now();
  const response=await browser.request(url,body);if(response.status!==200){console.warn(JSON.stringify({worker:'leclerc',operation:body?'mutation':'read',httpStatus:response.status}));throw new Error(response.status===403||response.status===401?'SESSION_REQUIRED':'PROVIDER_UNAVAILABLE');}
  if(/session.*expir/i.test(response.text))throw new Error('SESSION_REQUIRED');
  return response.text;
}
function storeUrl(path:string){if(!store?.host||!/^fd\d+-courses\.leclercdrive\.fr$/.test(store.host)||!/^\d+$/.test(store.id))throw new Error('STORE_REQUIRED');return `https://${store.host}/magasin-${store.id}-${store.id}/${path}`;}
async function cart(){return parseCart(await request(storeUrl('recherche.aspx?TexteRecherche=CuisinePanierSansResultat')));}
app.post('/operations/:operation',async(req,res)=>{
  const work=async()=>{
    const operation=String(req.params.operation),input=req.body;
    if(operation==='find_stores'){
      const q=z.string().min(2).max(120).parse(input.query),base='https://api-recherchemagasins.leclercdrive.fr/API_RechercheMagasins/api/v1';
      if(store&&[store.postalCode,store.city,store.name].some(value=>value&&q.toLowerCase().includes(value.toLowerCase()))){stores=[store];return stores;}
      const places=JSON.parse(await request(`${base}/autocomplete?search=${encodeURIComponent(q)}&provider=Woosmap`));const place=places.postalCodes?.[0];if(!place)return [];
      const coordinates=JSON.parse(await request(`${base}/autocomplete/coordinates?id=${encodeURIComponent(place.id)}&provider=Woosmap`));
      const points=JSON.parse(await request(`${base}/MapPoint/nearby?latitude=${encodeURIComponent(coordinates.latitude)}&longitude=${encodeURIComponent(coordinates.longitude)}&postalCode=${encodeURIComponent(place.postalCode)}`));
      stores=(points.points??[]).flatMap((p:Record<string,unknown>)=>{try{const host=new URL(String(p.urlSiteCourse??p.urlBase)).hostname;if(!/^fd\d+-courses\.leclercdrive\.fr$/.test(host))return [];return [{id:String(p.noPL),name:String(p.name),serviceType:['drive','relais','livraison'].includes(String(p.serviceType))?p.serviceType:'drive',postalCode:String(p.postalCode??''),city:String(p.city??''),host} as DriveStore];}catch{return [];}});return stores;
    }
    if(operation==='set_store'){const selected=stores.find(s=>s.id===input.storeId);if(!selected)throw new Error('STORE_REQUIRED');store=selected;await fs.writeFile(stateFile,JSON.stringify(store));return store;}
    if(operation==='get_store')return store;
    if(operation==='search_product'){const q=z.string().min(2).max(120).parse(input.query);return parseProducts(await request(storeUrl(`recherche.aspx?TexteRecherche=${encodeURIComponent(q)}`)));}
    if(operation==='get_cart')return cart();
    if(['add_to_cart','update_quantity','remove_from_cart'].includes(operation)){
      const id=z.string().regex(/^\d+$/).parse(input.productId),before=await cart(),previous=before.items.find(i=>i.productId===id)?.quantity??0;
      const quantity=operation==='remove_from_cart'?0:z.number().int().min(0).max(100).parse(input.quantity)+(operation==='add_to_cart'?previous:0);
      const data={eTypeAction:quantity>=previous?1:2,iIdProduit:id,iQuantite:quantity,sNoPointLivraison:store!.id,objContexteProvenanceArticle:{eOrigine:4,eTypePage:3,sTexteRecherche:'Cuisine',eVue:0,sInformationsComplementaires:'uni-2'}};
      const result=await request(storeUrl('panier.aspx?op=1'),new URLSearchParams({d:JSON.stringify(data)}).toString());
      if(!Array.isArray(JSON.parse(result)))throw new Error('PROVIDER_CHANGED');return cart();
    }
    throw new Error('OPERATION_UNKNOWN');
  };
  const next=queue.then(work,work);queue=next.catch(()=>{});
  try{res.json(await next);}catch(error){const message=error instanceof Error?error.message:'';console.warn(JSON.stringify({worker:'leclerc',operation:String(req.params.operation),code:error instanceof BrowserSetupError?'BROWSER_SETUP':message==='SESSION_REQUIRED'?'SESSION_REQUIRED':/panier|fournisseur|Prix/i.test(message)?'PARSER_CHANGED':'UNAVAILABLE',...(error instanceof BrowserSetupError?{instruction:error.message}:{})}));res.status(error instanceof BrowserSetupError?409:message==='SESSION_REQUIRED'?403:503).json({error:error instanceof BrowserSetupError?error.message:message==='SESSION_REQUIRED'?'Session Leclerc à reconnecter manuellement.':'Worker indisponible ou format fournisseur modifié.'});}
});
app.listen(Number(process.env.LECLERC_CONNECTOR_PORT??3102),'127.0.0.1',()=>console.info('Worker Leclerc isolé prêt sur la boucle locale.'));
