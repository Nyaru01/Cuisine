import { normalize } from "../../shared/domain.js";
import type { Ingredient } from "../../shared/types.js";
import type { DriveProduct } from "../../shared/drive.js";
export const synonyms:Record<string,string[]>={poulet:['filet de poulet','escalope de poulet'],crème:['crème liquide','crème fluide'],œufs:['oeufs'],"thon égoutté":['thon naturel'],"pois chiches égouttés":['pois chiches'],"bœuf haché":['boeuf haché']};
export function searchTerms(name:string){return [name,...(synonyms[name.toLowerCase()]??[])];}
function baseUnit(unit:string){return unit==='kg'?{unit:'g',scale:1000}:unit==='l'?{unit:'ml',scale:1000}:{unit,scale:1};}
export function packsNeeded(ingredient:Ingredient,product:DriveProduct){
  const need=baseUnit(ingredient.unit),pack=baseUnit(product.packUnit);
  if(need.unit!==pack.unit||!Number.isFinite(product.packQuantity)||product.packQuantity<=0)return null;
  return Math.ceil(ingredient.quantity*need.scale/(product.packQuantity*pack.scale));
}
export function scoreProduct(ingredient:Ingredient,product:DriveProduct,preferred=false){
  if(!product.available)return -Infinity;
  const wanted=normalize(ingredient.name).replace(/œ/g,'oe'),name=normalize(product.name).replace(/œ/g,'oe');
  // A prepared dish or flavoured derivative is not the raw ingredient requested by a recipe.
  const differentForms=['infusion','tisane','sauce','soupe','veloute','risotto','gratin','puree','repas bebe','pot bebe','galettes','palets','frits','croustine','chips','biscuits','jus','bordelaise','a la creme','petits pois','petit pois'];
  if(differentForms.some(form=>name.includes(form)&&!wanted.includes(form)))return -Infinity;
  if(wanted==='lait'&&/fermente|kefir|coco|amande|avoine|soja|chocolat|fraise/.test(name))return -Infinity;
  if(wanted==='thym'&&!/^thym\b/.test(name))return -Infinity;
  if(wanted==='colin'&&(!/filets?|dos|paves?|portions?/.test(name)||/beurre|citron|moutarde|oseille|parisienne|provencale|pane|marine/.test(name)))return -Infinity;
  if(wanted==='lardons'&&/volaille|poulet|dinde/.test(name))return -Infinity;
  if(wanted==='oignons'&&/vinaigre|confits?|caramelises?/.test(name))return -Infinity;
  if(wanted==='poulet'&&/pilons?|cuisses?|ailes?|entier|roti|carcasse/.test(name))return -Infinity;
  const tokens=wanted.split(' ').filter(s=>s.length>2);
  const match=tokens.filter(t=>name.includes(t)).length/Math.max(tokens.length,1);
  const quantity=packsNeeded(ingredient,product);
  if(match<0.5||quantity===null||quantity>100)return -Infinity;
  const need=baseUnit(ingredient.unit),pack=baseUnit(product.packUnit);
  const waste=(quantity*product.packQuantity*pack.scale)/(ingredient.quantity*need.scale)-1;
  const extraWords=name.split(' ').filter(word=>word.length>2&&!tokens.includes(word)).length;
  return match*100+(preferred?25:0)-extraWords*3-Math.min(waste*10,25)-Math.log1p(product.price*quantity)*5;
}
