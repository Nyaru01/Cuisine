import { Link } from "react-router-dom";
import { History as HistoryIcon } from "lucide-react";
import type { HistoryEntry } from "../../shared/types";
import { useApp, useApiQuery } from "../hooks/app";
import { PageHeading, QueryState } from "../components/common";
import { weekLabel } from "./Week";
export default function History() {
  const { recipes, openRecipe } = useApp(),
    query = useApiQuery<HistoryEntry[]>("/api/history");
  const frequencies = new Map<string, { count: number; last: string }>();
  for (const plan of query.data ?? [])
    for (const meal of plan.meals)
      if (meal.recipeId) {
        const old = frequencies.get(meal.recipeId);
        frequencies.set(meal.recipeId, {
          count: (old?.count ?? 0) + 1,
          last: old && old.last > meal.date ? old.last : meal.date,
        });
      }
  return (
    <>
      <PageHeading
        eyebrow="Les bons moments se gardent"
        title="Au fil des semaines."
        text="Vos repas planifiés des semaines passées. Ils aident à varier les prochaines idées."
      />
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.length === 0 && (
        <div className="empty-state">
          <HistoryIcon size={32} />
          <h2>L’histoire commence à table.</h2>
          <p>Vos premières semaines apparaîtront ici une fois terminées.</p>
        </div>
      )}
      <div className="history-layout">
        <div>
          {query.data?.map((plan) => (
            <section className="history-week" key={plan.week}>
              <h2>{weekLabel(plan.week)}</h2>
              {plan.meals.map((meal) => (
                <button
                  className="history-row"
                  key={meal.id}
                  disabled={!meal.recipeId}
                  onClick={() => meal.recipeId && openRecipe(meal.recipeId)}
                >
                  <span>
                    {new Date(`${meal.date}T12:00Z`).toLocaleDateString(
                      "fr-FR",
                      { timeZone: "Europe/Paris", weekday: "short" },
                    )}{" "}
                    · {meal.period}
                  </span>
                  <strong>
                    {recipes.find((r) => r.id === meal.recipeId)?.name ??
                      "Non planifié"}
                  </strong>
                </button>
              ))}
              <Link
                className="text-link"
                to={`/imprimer/semaine?week=${plan.week}`}
              >
                Voir le menu à imprimer
              </Link>
            </section>
          ))}
        </div>
        {frequencies.size > 0 && (
          <aside className="settings-panel">
            <h2>Déjà à notre table</h2>
            {[...frequencies]
              .sort((a, b) => b[1].count - a[1].count)
              .map(([id, entry]) => (
                <div className="frequency" key={id}>
                  <button
                    className="text-button"
                    onClick={() => openRecipe(id)}
                  >
                    {recipes.find((r) => r.id === id)?.name}
                  </button>
                  <p>
                    {entry.count} fois · dernière planification le{" "}
                    {new Date(`${entry.last}T12:00Z`).toLocaleDateString(
                      "fr-FR",
                      { timeZone: "Europe/Paris" },
                    )}
                  </p>
                </div>
              ))}
          </aside>
        )}
      </div>
    </>
  );
}
