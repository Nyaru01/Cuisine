import { test } from 'node:test';
import assert from 'node:assert/strict';
import {packsNeeded,scoreProduct,searchTerms} from '../server/drive/matcher.js';
import {LeclercProvider} from '../server/drive/leclerc.js';
import {packSize,parseProducts,parseCart} from '../services/leclerc-connector/parser.js';
const ingredient={name:'Filet de poulet',quantity:600,unit:'g',category:'Viande'};
const product={id:'test',name:'Filet de poulet 500 g',price:5,available:true,packQuantity:500,packUnit:'g'};
test('worker : lecture des formats réels sans inventer prix ni conditionnement',()=>{
  assert.deepEqual(packSize('Lait 6 x 1 L'),{packQuantity:6,packUnit:'l'});
  assert.deepEqual(packSize('Crème 20 cl'),{packQuantity:200,packUnit:'ml'});
  assert.equal(packSize('Poids inconnu'),null);
  const row={iIdProduit:42,sLibelleLigne1:'Poulet',sLibelleLigne2:'500 g',nrPVUnitaireTTC:5,iQteDisponible:3,iQuantitePanier:2,rTotalAPayer:10};
  const html=JSON.stringify({lstProduits:[row],lstProduitsLight:[{iIdProduit:42}],sTotalAPayer:'10,00 €'});
  assert.equal(parseProducts(html)[0].price,5);
  assert.equal(parseCart(html).totalPrice,10);
  assert.equal(parseCart(html).totalItems,2);
  assert.throws(()=>parseCart('<html>format inconnu</html>'));
});
test('quantités commerciales et unités incompatibles',()=>{
  assert.equal(packsNeeded(ingredient,product),2);
  assert.equal(packsNeeded(ingredient,{...product,packQuantity:1,packUnit:'kg'}),1);
  assert.equal(packsNeeded(ingredient,{...product,packUnit:'ml'}),null);
  assert.equal(packsNeeded(ingredient,{...product,packQuantity:0}),null);
});
test('matching : disponibilité, pertinence, gaspillage, préférence',()=>{
  assert.equal(scoreProduct(ingredient,{...product,available:false}),-Infinity);
  assert.equal(scoreProduct(ingredient,{...product,name:'Riz basmati'}),-Infinity);
  assert.ok(scoreProduct(ingredient,product,true)>scoreProduct(ingredient,product));
  assert.ok(scoreProduct(ingredient,product)>scoreProduct(ingredient,{...product,packQuantity:10000}));
  assert.ok(searchTerms('poulet').includes('filet de poulet'));
  const milk={...ingredient,name:'Lait',quantity:500,unit:'ml'};
  const plainMilk={...product,name:'Lait — format test 1',price:2.22,packQuantity:500,packUnit:'ml'};
  assert.ok(scoreProduct(milk,plainMilk)>scoreProduct(milk,{...plainMilk,name:'Lait de coco — format test 1',price:1.11}));
});
test('live : refus auth, réponse invalide, timeout et circuit breaker',async()=>{
  const originalFetch=globalThis.fetch;
  process.env.LECLERC_CONNECTOR_URL='http://127.0.0.1:9999';process.env.LECLERC_CONNECTOR_TOKEN='test-only';process.env.LECLERC_REQUEST_DELAY_MS='0';
  try{
    globalThis.fetch=async()=>new Response('{}',{status:403});
    await assert.rejects(new LeclercProvider().getCart(),/Reconnectez/);
    globalThis.fetch=async()=>new Response('not json',{status:200});
    const invalid=new LeclercProvider();
    for(let n=0;n<3;n++)await assert.rejects(invalid.getCart());
    await assert.rejects(invalid.getCart(),/temporairement indisponible/);
    globalThis.fetch=async()=>{throw new DOMException('Timeout','TimeoutError');};
    await assert.rejects(new LeclercProvider().getCart(),/ne répond pas/);
    globalThis.fetch=async()=>new Response('[]',{status:200});
    assert.deepEqual(await new LeclercProvider().findStores('69140'),[]);
  }finally{globalThis.fetch=originalFetch;delete process.env.LECLERC_CONNECTOR_URL;delete process.env.LECLERC_CONNECTOR_TOKEN;delete process.env.LECLERC_REQUEST_DELAY_MS;}
});
