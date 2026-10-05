import { useState } from "react";
import { Clock, ChefHat, Users, Check } from "lucide-react";
import { useApp } from "../hooks/app";
import { Dialog, FavoriteButton, FoodImage } from "./common";
import { scaledIngredients, displayQuantity } from "../../shared/domain";
import { RecipeEditor } from "./RecipeEditor";
export function RecipeDetail() {
  const { recipeId, recipes, closeRecipe, settings } = useApp();
  const [progress, setProgress] = useState<Record<string, number[]>>({});
  const [editing,setEditing]=useState(false);
  const completed = progress[recipeId ?? ""] ?? [];
  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) return null;
  if(editing)return <RecipeEditor key={recipe.id} recipe={recipe} onClose={()=>setEditing(false)} onSaved={()=>setEditing(false)}/>;
  const ingredients = scaledIngredients(recipe, settings.household);
  return (
    <Dialog
      title="Dans notre carnet"
      onClose={closeRecipe}
      className="recipe-modal"
    >
      <FoodImage recipe={recipe} className="detail-image" />
      <p className="photo-caption">Idée de présentation</p>
      <div className="detail-heading">
        <div>
          <h2>{recipe.name}</h2>
          <p>{recipe.description}</p>
        </div>
        <FavoriteButton recipe={recipe} />
      </div>
      <div className="detail-facts">
        {recipe.source==='custom'&&<button className="text-button" onClick={()=>setEditing(true)}>Modifier notre recette</button>}
        <span>
          <Clock size={17} />
          {recipe.preparationTime} min de préparation
        </span>
        <span>{recipe.cookingTime} min de cuisson</span>
        <span>Total {recipe.totalTime} min</span>
        <span>
          <ChefHat size={17} />
          {recipe.difficulty}
        </span>
      </div>
      <div className="portions-note">
        <Users size={18} />
        {settings.household.adults} adulte
        {settings.household.adults > 1 ? "s" : ""}
        {settings.household.children.length > 0 &&
          ` + ${settings.household.children.length} enfant${settings.household.children.length > 1 ? "s" : ""}`}
        <small>
          Quantités adaptées à votre foyer · pièces arrondies à l’unité
        </small>
      </div>
      <div className="recipe-columns">
        <section>
          <h3>Sur le plan de travail</h3>
          <ul className="ingredient-list">
            {ingredients.map((i) => (
              <li key={`${i.name}-${i.unit}`}>
                <span>{i.name}</span>
                <strong>{displayQuantity(i.quantity, i.unit)}</strong>
              </li>
            ))}
          </ul>
          {recipe.allergens.length > 0 && (
            <p className="allergens">
              Allergènes : {recipe.allergens.join(", ")}. Vérifiez aussi les
              étiquettes des produits utilisés.
            </p>
          )}
        </section>
        <section>
          <div className="steps-heading">
            <h3>En cuisine</h3>
            <span>
              {completed.length}/{recipe.instructions.length}
            </span>
          </div>
          <ol className="steps">
            {recipe.instructions.map((instruction, index) => (
              <li
                key={instruction}
                className={completed.includes(index) ? "done" : ""}
              >
                <button
                  aria-label={`Étape ${index + 1} ${completed.includes(index) ? "terminée" : "à terminer"}`}
                  aria-pressed={completed.includes(index)}
                  onClick={() =>
                    setProgress((prev) => ({
                      ...prev,
                      [recipe.id]: completed.includes(index)
                        ? completed.filter((i) => i !== index)
                        : [...completed, index],
                    }))
                  }
                >
                  {completed.includes(index) ? <Check size={18} /> : index + 1}
                </button>
                <p>{instruction}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Dialog>
  );
}
