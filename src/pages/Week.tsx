import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LockKeyhole,
  LockKeyholeOpen,
  RefreshCw,
  Printer,
  Clock,
  ArrowRight,
  Leaf,
} from "lucide-react";
import type { Plan, Meal } from "../../shared/types";
import {
  monday,
  addDays,
  parisToday,
  seasonFor,
  compatible,
} from "../../shared/domain";
import { useApp, useApiQuery, useAction } from "../hooks/app";
import {
  PageHeading,
  QueryState,
  Dialog,
  RecipeCard,
  FoodImage,
} from "../components/common";
export function weekLabel(week: string) {
  const end = addDays(week, 6);
  const startDate = new Date(`${week}T12:00Z`),
    endDate = new Date(`${end}T12:00Z`);
  return `${startDate.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", ...(week.slice(5, 7) !== end.slice(5, 7) ? { month: "long" } : {}) })} — ${endDate.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" })}`;
}
export function WeekNavigation({
  week,
  setWeek,
}: {
  week: string;
  setWeek: (week: string) => void;
}) {
  return (
    <div className="week-navigation">
      <button
        className="icon-button"
        aria-label="Semaine précédente"
        onClick={() => setWeek(addDays(week, -7))}
      >
        <ChevronLeft size={20} />
      </button>
      <span>{weekLabel(week)}</span>
      <button
        className="icon-button"
        aria-label="Semaine suivante"
        onClick={() => setWeek(addDays(week, 7))}
      >
        <ChevronRight size={20} />
      </button>
      {week !== monday() && (
        <button className="text-button" onClick={() => setWeek(monday())}>
          Cette semaine
        </button>
      )}
    </div>
  );
}
function Alternatives({
  meal,
  plan,
  onClose,
}: {
  meal: Meal;
  plan: Plan;
  onClose: () => void;
}) {
  const query = useApiQuery<import("../../shared/types").Recipe[]>(
      `/api/meals/${meal.id}/alternatives`,
    ),
    action = useAction("Le repas a été changé. Les courses sont à jour.");
  const replace = (recipeId?: string) =>
    action.mutate(
      {
        url: `/api/plans/${plan.id}/replace-meal`,
        body: { mealId: meal.id, recipeId, version: plan.version },
      },
      { onSuccess: onClose },
    );
  return (
    <Dialog title="Un peu de changement" onClose={onClose}>
      <h2>À vous de choisir.</h2>
      <p>
        Trois idées qui complètent votre semaine. Les autres repas restent en
        place.
      </p>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      <div className={`alternatives-grid ${action.isPending ? "busy" : ""}`}>
        {query.data?.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onSelect={() => {
              if (!action.isPending) replace(recipe.id);
            }}
          />
        ))}
      </div>
      {query.data?.length === 0 && (
        <p>
          Aucune alternative compatible. Ajustez vos exclusions ou le planning.
        </p>
      )}
      <button
        className="button"
        disabled={action.isPending || !query.data?.length}
        onClick={() => replace()}
      >
        <Sparkles size={17} />
        {action.isPending ? "On met la table…" : "Surprends-moi"}
      </button>
    </Dialog>
  );
}
export default function Week() {
  const [week, setWeek] = useState(monday()),
    [changing, setChanging] = useState<Meal | null>(null);
  const { recipes, openRecipe, settings } = useApp(),
    query = useApiQuery<Plan>(`/api/plans/${week}`),
    todayQuery = useApiQuery<Plan>("/api/plans/current"),
    action = useAction("Votre semaine et vos courses sont prêtes."),
    lock = useAction("Verrouillage du repas mis à jour.");
  const plan = query.data,
    today = parisToday(),
    season = seasonFor(week),
    generated = plan?.meals.some((m) => m.recipeId);
  const todayMeals =
    todayQuery.data?.meals.filter((m) => m.date === today && m.recipeId) ?? [];
  const currentMeal =
    todayMeals.find(
      (m) =>
        m.period ===
        (Number(
          new Intl.DateTimeFormat("fr-FR", {
            timeZone: "Europe/Paris",
            hour: "numeric",
            hourCycle: "h23",
          }).format(new Date()),
        ) < 14
          ? "midi"
          : "soir"),
    ) ?? todayMeals.at(-1);
  const currentRecipe = recipes.find((r) => r.id === currentMeal?.recipeId);
  const mismatch = plan?.meals.some((m) => {
    const r = recipes.find((r) => r.id === m.recipeId);
    return r && !compatible(r, settings);
  });
  return (
    <div data-season={season}>
      <PageHeading
        eyebrow="Moins de questions, plus de bons moments"
        title="La semaine se savoure."
        text="Des repas de saison, pensés pour toute votre tribu."
      >
        <button
          className="button"
          disabled={action.isPending || !plan}
          onClick={() =>
            action.mutate({
              url: "/api/plans/generate",
              body: { week, version: plan?.version },
            })
          }
        >
          <Sparkles size={18} />
          {action.isPending
            ? "On compose votre menu…"
            : generated
              ? "Régénérer la semaine"
              : "Générer ma semaine"}
        </button>
      </PageHeading>
      <section className="week-summary">
        <div className="week-summary-main">
          <div className="summary-label">
            <span className="eyebrow">
              {week === monday() ? "Cette semaine" : "Votre planning"}
            </span>
            <span className="season-pill">
              <Leaf size={14} />
              {season}
            </span>
          </div>
          <WeekNavigation week={week} setWeek={setWeek} />
          <p>
            {settings.household.adults} adultes
            {settings.household.children.length
              ? ` & ${settings.household.children.length} enfant${settings.household.children.length > 1 ? "s" : ""}`
              : ""}{" "}
            <span>·</span> 9 repas <span>·</span> À partager
          </p>
          <Link className="text-link" to={`/courses?week=${week}`}>
            La liste de courses suit le menu <ArrowRight size={16} />
          </Link>
        </div>
        <div className="season-art">
          <img
            src="/images/family-table.webp"
            alt="Une table familiale et des légumes rôtis à partager"
            width="340"
            height="200"
          />
          <span>Le goût des choses simples.</span>
        </div>
      </section>
      <section className="today-section">
        <div className="today-tag">
          <span className="today-dot" />
          Aujourd’hui
          <small>
            {new Date(`${today}T12:00Z`).toLocaleDateString("fr-FR", {
              timeZone: "Europe/Paris",
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </small>
        </div>
        {currentRecipe ? (
          <>
            <div className="today-image">
              <FoodImage recipe={currentRecipe} />
            </div>
            <div className="today-description">
              <span className="eyebrow">
                {currentMeal?.period === "midi" ? "Ce midi" : "Ce soir"}, on se
                régale
              </span>
              <h2>{currentRecipe.name}</h2>
              <p>
                {currentRecipe.preparationTime} min de préparation ·{" "}
                {currentRecipe.cookingTime} min de cuisson
              </p>
            </div>
            <button
              className="button secondary"
              onClick={() => openRecipe(currentRecipe.id)}
            >
              Voir la recette <ArrowRight size={17} />
            </button>
          </>
        ) : (
          <div className="today-description">
            <h2>Qu’est-ce qu’on mange ?</h2>
            <p>Générez la semaine actuelle pour découvrir le repas du jour.</p>
          </div>
        )}
      </section>
      <div className="section-heading">
        <div>
          <h2>Le menu de la semaine</h2>
          <p>Un plat vous plaît ? Verrouillez-le pour le garder.</p>
        </div>
        <Link
          className="text-link print-link"
          to={`/imprimer/semaine?week=${week}`}
        >
          <Printer size={17} />
          Imprimer la semaine
        </Link>
      </div>
      {mismatch && (
        <div className="notice">
          Certains repas ne correspondent plus à vos exclusions. Régénérez la
          semaine pour les actualiser.
        </div>
      )}
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {!generated && plan && (
        <div className="empty-state">
          <Sparkles size={30} />
          <h2>Une semaine à inventer.</h2>
          <p>
            Nous composons neuf repas variés, avec les bonnes quantités pour
            votre famille.
          </p>
          <button
            className="button"
            disabled={action.isPending}
            onClick={() =>
              action.mutate({
                url: "/api/plans/generate",
                body: { week, version: plan.version },
              })
            }
          >
            Générer ma semaine
          </button>
        </div>
      )}
      {generated && plan && (
        <div className="meal-grid">
          {plan.meals.map((meal) => {
            const recipe = recipes.find((r) => r.id === meal.recipeId);
            if (!recipe) return null;
            return (
              <article
                className={`meal-card ${meal.date === today ? "is-today" : ""}`}
                key={meal.id}
              >
                <div className="meal-day">
                  <strong>
                    {new Date(`${meal.date}T12:00Z`).toLocaleDateString(
                      "fr-FR",
                      { timeZone: "Europe/Paris", weekday: "long" },
                    )}
                  </strong>
                  <span>
                    {meal.period === "midi" ? "Déjeuner" : "Dîner"}{" "}
                    {meal.date === today && "· Aujourd’hui"}
                  </span>
                </div>
                <button
                  className="image-button meal-photo"
                  aria-label={`Voir la recette ${recipe.name}`}
                  onClick={() => openRecipe(recipe.id)}
                >
                  <FoodImage recipe={recipe} />
                  {recipe.vegetarian && (
                    <span className="image-label">
                      <Leaf size={13} />
                      Végétarien
                    </span>
                  )}
                </button>
                <div className="meal-body">
                  <button
                    className="recipe-name"
                    onClick={() => openRecipe(recipe.id)}
                  >
                    {recipe.name}
                  </button>
                  <div className="recipe-meta">
                    <span>
                      <Clock size={14} />
                      {recipe.totalTime} min
                    </span>
                    <span>{recipe.difficulty}</span>
                  </div>
                  <div className="meal-actions">
                    <button
                      className="text-button"
                      onClick={() => openRecipe(recipe.id)}
                    >
                      La recette <ArrowRight size={14} />
                    </button>
                    <button
                      className="change-button"
                      disabled={
                        meal.locked || lock.isPending || action.isPending
                      }
                      onClick={() => setChanging(meal)}
                    >
                      <RefreshCw size={14} />
                      Changer
                    </button>
                    <button
                      className={`icon-button lock ${meal.locked ? "active" : ""}`}
                      aria-label={
                        meal.locked
                          ? "Déverrouiller le repas"
                          : "Verrouiller le repas"
                      }
                      aria-pressed={meal.locked}
                      disabled={lock.isPending || action.isPending}
                      onClick={() =>
                        lock.mutate({
                          url: `/api/meals/${meal.id}/lock`,
                          method: "PATCH",
                          body: { locked: !meal.locked, version: plan.version },
                        })
                      }
                    >
                      {meal.locked ? (
                        <LockKeyhole size={17} />
                      ) : (
                        <LockKeyholeOpen size={17} />
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {changing && plan && (
        <Alternatives
          meal={changing}
          plan={plan}
          onClose={() => setChanging(null)}
        />
      )}
      <div className="week-footer">
        <Leaf size={18} />
        <p>Le menu suit les saisons. Vous gardez le dernier mot.</p>
        <span>Fait pour les vraies vies de famille.</span>
      </div>
    </div>
  );
}
