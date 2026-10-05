import type {DriveProduct,DriveCart} from '../../shared/drive.js';
export function jsonValue(text:string,start:number){
  const first=text[start];if(first!=='{'&&first!=='[')throw new Error('JSON absent');
  let depth=0,quoted=false,escaped=false;
  for(let i=start;i<text.length;i++){
    const c=text[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
    if(c==='"'){quoted=true;continue;}if(c==='{'||c==='[')depth++;if(c==='}'||c===']')depth--;
    if(depth===0)return {value:JSON.parse(text.slice(start,i+1)) as unknown,end:i+1};
  }
  throw new Error('Réponse fournisseur tronquée');
}
export function productRecords(html:string){
  const rows=new Map<string,Record<string,unknown>>();
  for(const match of html.matchAll(/"iIdProduit"\s*:/g)){
    const start=html.lastIndexOf('{',match.index);if(start<0)continue;
    try{const value=jsonValue(html,start).value as Record<string,unknown>;if(value.iIdProduit&&value.sLibelleLigne1)rows.set(String(value.iIdProduit),value);}catch{/* objets qui ne sont pas des produits */}
  }
  return [...rows.values()];
}
export function price(value:unknown){if(typeof value==='number'&&Number.isFinite(value))return value;const parsed=Number(String(value??'').replace(/\s/g,'').replace('€','').replace(',','.'));if(!Number.isFinite(parsed)||parsed<0)throw new Error('Prix fournisseur invalide');return parsed;}
export function packSize(label:string){
  const match=/(?:\b(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l)\b/i.exec(label);
  if(match){let amount=Number(match[2].replace(',','.'))*Number(match[1]??1);let unit=match[3].toLowerCase();if(unit==='cl'){amount*=10;unit='ml';}return {packQuantity:amount,packUnit:unit};}
  const pieces=/(\d+)\s*(?:œufs|oeufs|pièces?|tranches?)\b/i.exec(label);
  return pieces?{packQuantity:Number(pieces[1]),packUnit:/tranche/i.test(pieces[0])?'tranche':'pièce'}:null;
}
export function parseProducts(html:string):DriveProduct[]{
  return productRecords(html).flatMap(row=>{
    const name=[row.sLibelleLigne1,row.sLibelleLigne2].filter(Boolean).join(' '),pack=packSize(name);
    if(!pack)return [];
    try{return [{id:String(row.iIdProduit),name,price:price(row.nrPVUnitaireTTC??row.sPrixUnitaire),available:Number(row.iQteDisponible)>0,...pack}];}catch{return [];}
  }).slice(0,10);
}
export function parseCart(html:string):DriveCart{
  const position=html.indexOf('"lstProduits":');
  if(position<0)throw new Error('Format panier fournisseur inconnu');
  const array=jsonValue(html,html.indexOf('[',position)).value;
  if(!Array.isArray(array))throw new Error('Panier fournisseur invalide');
  const items=array.map(entry=>{
    const row=(entry.objElement??entry) as Record<string,unknown>,quantity=Number(row.iQuantitePanier??row.iQtePanier),unitPrice=price(row.nrPVUnitaireTTC??row.sPrixUnitaire);
    if(!Number.isInteger(quantity)||quantity<0||!row.iIdProduit)throw new Error('Ligne panier invalide');
    return {productId:String(row.iIdProduit),name:[row.sLibelleLigne1,row.sLibelleLigne2].filter(Boolean).join(' '),quantity,unitPrice,totalPrice:price(row.rTotalAPayer??row.sTotalAPayer??unitPrice*quantity)};
  }).filter(i=>i.quantity>0);
  const light=html.indexOf('"lstProduitsLight":');if(light<0)throw new Error('Total panier absent');
  const lightArray=jsonValue(html,html.indexOf('[',light));
  const total=/"sTotalAPayer"\s*:\s*"([^"]+)"/.exec(html.slice(lightArray.end,lightArray.end+2500));if(!total)throw new Error('Total panier fournisseur absent');
  return {items,totalItems:items.reduce((s,i)=>s+i.quantity,0),totalPrice:price(total[1]),updatedAt:new Date().toISOString()};
}
