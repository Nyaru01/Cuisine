import { useState } from "react";
import { Search, Heart, Leaf, Plus } from "lucide-react";
import { RecipeEditor } from "../components/RecipeEditor";
import { useApp } from "../hooks/app";
import { RecipeCard, PageHeading } from "../components/common";
import {
  normalize,
  seasonFor,
  parisToday,
  compatible,
} from "../../shared/domain";
export default function Recipes({
  favoritesOnly = false,
}: {
  favoritesOnly?: boolean;
}) {
  const { recipes, favorites, settings } = useApp(),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState(favoritesOnly ? "all" : "season"),
    [editing,setEditing]=useState(false);
  const visible = recipes.filter(
    (r) =>
      (!favoritesOnly || favorites.includes(r.id)) &&
      normalize(
        `${r.name} ${r.ingredients.map((i) => i.name).join(" ")}`,
      ).includes(normalize(search)) &&
      (filter === "all" ||
        (filter === "mine" && r.source === "custom") ||
        (filter === "season" &&
          r.months.includes(Number(parisToday().slice(5, 7)))) ||
        (filter === "veggie" && r.vegetarian) ||
        (filter === "quick" && r.totalTime <= 35) ||
        (filter === "compatible" && compatible(r, settings))),
  );
  return (
    <>
      <PageHeading
        eyebrow={
          favoritesOnly
            ? "À refaire, encore et encore"
            : "Notre carnet de cuisine"
        }
        title={favoritesOnly ? "Les petits préférés." : "De quoi se régaler."}
        text={
          favoritesOnly
            ? "Ces plats ont une place particulière à votre table."
            : `${recipes.length} vraies recettes familiales. Simples, généreuses, de saison.`
        }
      ><button className="button" onClick={()=>setEditing(true)}><Plus size={18}/>Ajouter une recette</button></PageHeading>
      <div className="recipe-toolbar">
        <label className="search-field">
          <Search size={20} />
          <span className="sr-only">Chercher un plat ou un ingrédient</span>
          <input
            placeholder="Un plat, un ingrédient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="filter-pills">
          {[
            ["all", "Tout le carnet"],
            ["season", `De saison · ${seasonFor(parisToday())}`],
            ["mine", "Mes recettes"],
            ["veggie", "Végétarien"],
            ["quick", "35 min ou moins"],
            ["compatible", "Pour notre famille"],
          ].map(([id, name]) => (
            <button
              key={id}
              className={filter === id ? "selected" : ""}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {id === "season" && <Leaf size={14} />} {name}
            </button>
          ))}
        </div>
      </div>
      <p className="result-count">
        {visible.length} recette{visible.length > 1 ? "s" : ""}
      </p>
      <div className="catalog-grid">
        {visible.map((recipe) => (
          <RecipeCard recipe={recipe} key={recipe.id} />
        ))}
      </div>
      {visible.length === 0 && (
        <div className="empty-state">
          <Heart size={32} />
          <h2>
            {favoritesOnly
              ? "Vos coups de cœur vous attendent ici."
              : "Aucune recette trouvée."}
          </h2>
          <p>
            {favoritesOnly
              ? "Touchez le cœur d’une recette pour la retrouver facilement."
              : "Essayez un autre mot ou un autre filtre."}
          </p>
        </div>
      )}
      {editing&&<RecipeEditor onClose={()=>setEditing(false)} onSaved={()=>{setEditing(false);setFilter('mine');}}/>}
    </>
  );
}
