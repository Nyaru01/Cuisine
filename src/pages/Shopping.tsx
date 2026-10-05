import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Printer, ShoppingBasket, Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ShoppingItem } from "../../shared/types";
import { monday, displayQuantity } from "../../shared/domain";
import { useApiQuery, useApp } from "../hooks/app";
import { api } from "../services/api";
import { PageHeading, QueryState } from "../components/common";
import { WeekNavigation } from "./Week";
import { DrivePanel } from "../components/DrivePanel";
export default function Shopping() {
  const [params, setParams] = useSearchParams(),
    week = params.get("week") || monday(),
    [hideChecked, setHideChecked] = useState(false),
    [driveTab,setDriveTab]=useState(false);
  const feature=useApiQuery<{driveEnabled?:boolean}>('/api/bootstrap');
  const url = `/api/shopping-list/${week}`,
    query = useApiQuery<ShoppingItem[]>(url),
    client = useQueryClient(),
    { toast, online } = useApp();
  const action = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      if (!online)
        throw new Error("Reconnectez-vous pour modifier les courses.");
      return api(`/api/shopping-list/items/${id}`, "PATCH", { checked });
    },
    onMutate: async ({ id, checked }) => {
      await client.cancelQueries({ queryKey: [url] });
      const previous = client.getQueryData<ShoppingItem[]>([url]);
      client.setQueryData<ShoppingItem[]>([url], (items) =>
        items?.map((i) => (i.id === id ? { ...i, checked } : i)),
      );
      return { previous };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) client.setQueryData([url], context.previous);
      toast(error.message);
    },
    onSuccess: () => toast("Courses mises à jour."),
    onSettled: () => client.invalidateQueries({ queryKey: [url] }),
  });
  const items = query.data ?? [],
    checked = items.filter((i) => i.checked).length,
    categories = [...new Set(items.map((i) => i.category))];
  return (
    <>
      <PageHeading
        eyebrow="Un passage au marché, et c’est réglé"
        title="Dans notre panier."
        text="Les ingrédients de votre semaine, aux quantités de votre famille."
      >
        <Link
          className="button secondary"
          to={`/imprimer/courses?week=${week}`}
        >
          <Printer size={18} />
          Imprimer les courses
        </Link>
      </PageHeading>
      {feature.data?.driveEnabled&&<div className="filter-pills" aria-label="Vue des courses"><button aria-pressed={!driveTab} className={!driveTab?'selected':''} onClick={()=>setDriveTab(false)}>Liste</button><button aria-pressed={driveTab} className={driveTab?'selected':''} onClick={()=>setDriveTab(true)}>E.Leclerc Drive</button></div>}
      {driveTab&&feature.data?.driveEnabled?<DrivePanel key={week} week={week}/>:<>
      <div className="toolbar">
        <WeekNavigation week={week} setWeek={(week) => setParams({ week })} />
        <label className="toggle">
          <input
            type="checkbox"
            checked={hideChecked}
            onChange={(e) => setHideChecked(e.target.checked)}
          />
          Masquer les articles cochés
        </label>
      </div>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {items.length ? (
        <>
          <div className="shopping-progress">
            <span>
              <ShoppingBasket size={19} />
              {checked} / {items.length} articles dans le panier
            </span>
            <progress value={checked} max={items.length} />
          </div>
          <div className="shopping-grid">
            {categories.map((category) => (
              <section className="shopping-category" key={category}>
                <h2>
                  {category}
                  <span>
                    {items.filter((i) => i.category === category).length}
                  </span>
                </h2>
                {items
                  .filter(
                    (i) =>
                      i.category === category && (!hideChecked || !i.checked),
                  )
                  .map((item) => (
                    <label
                      className={`shopping-row ${item.checked ? "checked" : ""}`}
                      key={item.id}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        disabled={action.isPending}
                        onChange={(e) =>
                          action.mutate({
                            id: item.id,
                            checked: e.target.checked,
                          })
                        }
                      />
                      <span className="custom-check">
                        {item.checked && <Check size={15} />}
                      </span>
                      <span className="shopping-name">{item.name}</span>
                      <strong>
                        {displayQuantity(item.quantity, item.unit)}
                      </strong>
                    </label>
                  ))}
              </section>
            ))}
          </div>
          <p className="small-note">
            Les quantités sont à cuisiner : ajustez aux conditionnements
            disponibles. Une quantité modifiée est remise à cocher.
          </p>
        </>
      ) : (
        !query.isPending && (
          <div className="empty-state">
            <ShoppingBasket size={36} />
            <h2>Le panier attend son menu.</h2>
            <p>
              Générez les repas de cette semaine : votre liste se remplira
              automatiquement.
            </p>
            <Link className="button" to="/">
              Préparer la semaine
            </Link>
          </div>
        )
      )}
      </>}
    </>
  );
}
