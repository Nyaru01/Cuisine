import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Recipe, Season, Ingredient } from "../../shared/types";
import { Dialog } from "./common";
import { useAction } from "../hooks/app";
export function RecipeEditor({recipe,onClose,onSaved}:{recipe?:Recipe;onClose:()=>void;onSaved:()=>void}){
  const [name,setName]=useState(recipe?.name??""),[description,setDescription]=useState(recipe?.description??""),
    [prep,setPrep]=useState(recipe?.preparationTime??15),[cook,setCook]=useState(recipe?.cookingTime??20),[servings,setServings]=useState(recipe?.servings??4),
    [instructions,setInstructions]=useState(recipe?.instructions.join('\n')??""),[ingredients,setIngredients]=useState<Ingredient[]>(recipe?.ingredients??[{name:"",quantity:100,unit:"g",category:"Fruits et légumes"}]),
    [seasons,setSeasons]=useState<Season[]>(recipe?.seasons??["hiver","printemps","été","automne"]),[veggie,setVeggie]=useState(recipe?.vegetarian??false),
    [child,setChild]=useState(recipe?.childFriendly??true),[allergens,setAllergens]=useState(recipe?.allergens.join(', ')??""),[protein,setProtein]=useState(recipe?.protein??"légumineuses"),
    [starch,setStarch]=useState(recipe?.starch??"aucun"),[light,setLight]=useState(recipe?.light??true),[difficulty,setDifficulty]=useState(recipe?.difficulty??"Facile");
  const action=useAction('Votre recette est enregistrée dans le carnet du foyer.');
  const change=(index:number,key:keyof Ingredient,value:string|number)=>setIngredients(rows=>rows.map((i,n)=>n===index?{...i,[key]:value}:i));
  return <Dialog title={recipe?'Modifier notre recette':'Ajouter notre recette'} onClose={onClose} className="recipe-editor">
    <h2>{recipe?'Un petit ajustement.':'Une recette de chez nous.'}</h2>
    <p>Enregistrée pour tout le foyer, disponible dans les menus et les courses.</p>
    <form onSubmit={async(e)=>{e.preventDefault();const months=Array.from({length:12},(_,i)=>i+1).filter(m=>seasons.includes(m>=3&&m<=5?'printemps':m>=6&&m<=8?'été':m>=9&&m<=11?'automne':'hiver'));try{await action.mutateAsync({url:recipe?`/api/recipes/${recipe.id}`:'/api/recipes',method:recipe?'PUT':'POST',body:{name,description,preparationTime:prep,cookingTime:cook,servings,instructions:instructions.split('\n').map(s=>s.trim()).filter(Boolean),ingredients,seasons,months,vegetarian:veggie,childFriendly:child,allergens:allergens.split(',').map(s=>s.trim()).filter(Boolean),protein,starch,light,difficulty}});onSaved();}catch{/* toast commun */}}}>
      <label className="field">Nom de la recette<input required maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label>
      <label className="field">Description<textarea required maxLength={1500} value={description} onChange={e=>setDescription(e.target.value)}/></label>
      <div className="editor-facts">{[['Préparation (min)',prep,setPrep],['Cuisson (min)',cook,setCook],['Portions adultes de la recette',servings,setServings]].map(([label,value,set])=><label className="field" key={String(label)}>{String(label)}<input required type="number" min={label==='Portions adultes de la recette'?1:0} max={label==='Portions adultes de la recette'?30:1440} value={Number(value)} onChange={e=>(set as (n:number)=>void)(Number(e.target.value))}/></label>)}</div>
      <label className="field">Difficulté<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{['Facile','Moyen','Difficile'].map(s=><option key={s}>{s}</option>)}</select></label>
      <fieldset><legend>Ingrédients pour {servings} portions adultes</legend>{ingredients.map((item,index)=><div className="ingredient-editor" key={index}>
        <label className="field">Ingrédient {index+1}<input required maxLength={160} value={item.name} onChange={e=>change(index,'name',e.target.value)}/></label>
        <label className="field">Quantité<input required type="number" min="0.01" max="100000" step="any" value={item.quantity} onChange={e=>change(index,'quantity',Number(e.target.value))}/></label>
        <label className="field">Unité<select value={item.unit} onChange={e=>change(index,'unit',e.target.value)}>{['g','kg','ml','l','pièce','tranche'].map(u=><option key={u}>{u}</option>)}</select></label>
        <label className="field">Rayon<select value={item.category} onChange={e=>change(index,'category',e.target.value)}>{['Fruits et légumes','Viande','Poisson','Crèmerie','Produits frais','Féculents','Épicerie','Conserves'].map(c=><option key={c}>{c}</option>)}</select></label>
        <button type="button" className="icon-button" disabled={ingredients.length===1} aria-label={`Retirer l’ingrédient ${index+1}`} onClick={()=>setIngredients(rows=>rows.filter((_,n)=>n!==index))}><Trash2 size={18}/></button>
      </div>)}<button type="button" className="text-button" disabled={ingredients.length>=80} onClick={()=>setIngredients(rows=>[...rows,{name:'',quantity:100,unit:'g',category:'Fruits et légumes'}])}><Plus size={18}/>Ajouter un ingrédient</button></fieldset>
      <label className="field">Étapes — une par ligne<textarea required rows={7} maxLength={50000} value={instructions} onChange={e=>setInstructions(e.target.value)}/></label>
      <fieldset><legend>Saisons</legend><div className="allergy-grid">{(['hiver','printemps','été','automne'] as Season[]).map(s=><label key={s}><input type="checkbox" checked={seasons.includes(s)} onChange={e=>setSeasons(e.target.checked?[...seasons,s]:seasons.filter(v=>v!==s))}/>{s}</label>)}</div>{!seasons.length&&<p role="alert">Choisissez au moins une saison.</p>}</fieldset>
      <div className="allergy-grid"><label><input type="checkbox" checked={veggie} onChange={e=>setVeggie(e.target.checked)}/>Végétarien</label><label><input type="checkbox" checked={child} onChange={e=>setChild(e.target.checked)}/>Adapté aux enfants</label><label><input type="checkbox" checked={light} onChange={e=>setLight(e.target.checked)}/>Plat léger</label></div>
      <label className="field">Allergènes, séparés par des virgules<input value={allergens} onChange={e=>setAllergens(e.target.value)}/><small>Indiquez tous les allergènes des ingrédients utilisés.</small></label>
      <div className="editor-facts"><label className="field">Protéine principale<input required maxLength={160} value={protein} onChange={e=>setProtein(e.target.value)}/></label><label className="field">Féculent principal<input required maxLength={160} value={starch} onChange={e=>setStarch(e.target.value)}/></label></div>
      <button className="button" disabled={action.isPending||!seasons.length}>{action.isPending?'Enregistrement…':'Enregistrer la recette'}</button>
    </form>
  </Dialog>;
}
