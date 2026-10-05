import { Link, useParams, useSearchParams } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { useApp, useApiQuery } from "../hooks/app";
import type { Plan, ShoppingItem } from "../../shared/types";
import { monday, addDays, displayQuantity } from "../../shared/domain";
import { weekLabel } from "./Week";
import { QueryState } from "../components/common";
export default function Print() {
  const { kind } = useParams(),
    [params] = useSearchParams(),
    week = params.get("week") || monday(),
    { recipes, settings } = useApp(),
    plan = useApiQuery<Plan>(`/api/plans/${week}`),
    shopping = useApiQuery<ShoppingItem[]>(`/api/shopping-list/${week}`),
    courses = kind === "courses";
  const query = courses ? shopping : plan;
  return (
    <div
      className={`print-preview ${courses ? "print-shopping" : "print-week"}`}
    >
      <div className="print-controls">
        <Link
          className="text-link"
          to={courses ? `/courses?week=${week}` : "/"}
        >
          <ArrowLeft size={17} />
          Retour
        </Link>
        <button
          className="button"
          disabled={query.isPending || !!query.error}
          onClick={() => window.print()}
        >
          <Printer size={18} />
          Imprimer en A4
        </button>
      </div>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      <article className="print-sheet">
        <header>
          <span className="brand">
            À Table<span>!</span>
          </span>
          <span>Notre carnet familial</span>
        </header>
        <h1>{courses ? "La liste de courses" : "Notre menu de la semaine"}</h1>
        <p className="print-subtitle">
          {weekLabel(week)} · {settings.household.adults} adultes &{" "}
          {settings.household.children.length} enfant(s)
        </p>
        {courses ? (
          <div className="print-categories">
            {[...new Set(shopping.data?.map((i) => i.category))].map(
              (category) => (
                <section key={category}>
                  <h2>{category}</h2>
                  {shopping.data
                    ?.filter((i) => i.category === category)
                    .map((item) => (
                      <div className="print-item" key={item.id}>
                        <span className="paper-checkbox" />
                        <span>{item.name}</span>
                        <strong>
                          {displayQuantity(item.quantity, item.unit)}
                        </strong>
                      </div>
                    ))}
                </section>
              ),
            )}
          </div>
        ) : (
          <div className="print-days">
            {Array.from({ length: 7 }, (_, day) => {
              const date = addDays(week, day);
              return (
                <section key={day}>
                  <h2>
                    {new Date(`${date}T12:00Z`).toLocaleDateString("fr-FR", {
                      timeZone: "Europe/Paris",
                      weekday: "long",
                      day: "numeric",
                    })}
                  </h2>
                  {plan.data?.meals
                    .filter((m) => m.date === date)
                    .map((meal) => {
                      const recipe = recipes.find(
                        (r) => r.id === meal.recipeId,
                      );
                      return (
                        <div key={meal.id}>
                          <span className="eyebrow">
                            {meal.period === "midi" ? "Déjeuner" : "Dîner"}
                          </span>
                          <strong>{recipe?.name ?? "À prévoir"}</strong>
                          <small>
                            {recipe
                              ? `${recipe.preparationTime} min de préparation · ${recipe.cookingTime} min de cuisson`
                              : ""}
                          </small>
                        </div>
                      );
                    })}
                </section>
              );
            })}
          </div>
        )}
        <footer>De saison. En famille. Tout simplement.</footer>
      </article>
    </div>
  );
}
