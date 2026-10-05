import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Printer, ShoppingBasket, Check, Plus, Pencil, Trash2, Leaf } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ShoppingItem } from "../../shared/types";
import { shoppingCategories, shoppingUnits } from "../../shared/shopping";
import { monday, displayQuantity } from "../../shared/domain";
import { useApiQuery, useApp, useAction } from "../hooks/app";
import { api } from "../services/api";
import { PageHeading, QueryState, Dialog } from "../components/common";
import { WeekNavigation } from "./Week";
import { DrivePanel } from "../components/DrivePanel";

function ProductEditor({ item, week, onClose }: { item: ShoppingItem | null; week: string; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? ""),
    [quantity, setQuantity] = useState(String(item?.quantity ?? 1)),
    [unit, setUnit] = useState(item?.unit ?? "pièce"),
    [category, setCategory] = useState(item?.category ?? "Autres"),
    [confirmDelete, setConfirmDelete] = useState(false);
  const { online } = useApp();
  const save = useAction(item ? "Produit modifié." : "Produit ajouté à votre liste partagée.");
  const remove = useAction("Produit supprimé.");
  const pending = save.isPending || remove.isPending;
  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate({ url: item ? `/api/shopping-list/items/${item.id}` : `/api/shopping-list/${week}/items`, method: item ? "PUT" : "POST", body: { name, quantity: Number(quantity), unit, category } }, { onSuccess: onClose });
  }
  return <Dialog title={item ? "Modifier notre produit" : "Ajouter à nos courses"} onClose={() => { if (!pending) onClose(); }} className="product-editor">
    <h2>{item ? "Un petit ajustement." : "On pense aussi à…"}</h2>
    <p className="product-intro">Le café, le petit-déjeuner, les produits de la maison… Vos ajouts restent ici quand le menu change.</p>
    <form onSubmit={submit}>
      <fieldset disabled={pending || !online}>
        <label className="field">Produit<input autoFocus required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Café, yaourts, lessive…" /></label>
        <div className="product-amount">
          <label className="field">Quantité<input type="number" inputMode="decimal" required min="0.01" max="100000" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
          <label className="field">Unité<select value={unit} onChange={e => setUnit(e.target.value)}>{shoppingUnits.map(u => <option key={u}>{u}</option>)}</select></label>
        </div>
        <label className="field">Rayon<select value={category} onChange={e => setCategory(e.target.value)}>{shoppingCategories.map(c => <option key={c}>{c}</option>)}</select></label>
        <button className="button product-save" type="submit"><Check size={18} />{pending ? "Enregistrement…" : item ? "Enregistrer les modifications" : "Ajouter à la liste"}</button>
      </fieldset>
      {save.error && <p role="alert" className="product-error">{save.error.message}</p>}
      {!online && <p role="status">Reconnectez-vous pour enregistrer votre produit.</p>}
    </form>
    {item && <div className="product-delete">
      {confirmDelete ? <><p>Supprimer « {item.name} » de cette semaine ?</p><div className="product-delete-actions"><button className="button secondary" disabled={pending} onClick={() => setConfirmDelete(false)}>Garder le produit</button><button className="button danger" disabled={pending || !online} onClick={() => remove.mutate({ url: `/api/shopping-list/items/${item.id}`, method: "DELETE" }, { onSuccess: onClose })}>Supprimer</button></div></> : <button className="text-button" disabled={pending || !online} onClick={() => setConfirmDelete(true)}><Trash2 size={16} />Supprimer ce produit</button>}
      {remove.error && <p role="alert" className="product-error">{remove.error.message}</p>}
    </div>}
  </Dialog>;
}

export default function Shopping() {
  const [params, setParams] = useSearchParams(), week = params.get("week") || monday();
  const [filter, setFilter] = useState<"all" | "remaining" | "manual">("all"),
    [driveTab, setDriveTab] = useState(false),
    [editor, setEditor] = useState<{ item: ShoppingItem | null; week: string } | null>(null);
  const feature = useApiQuery<{ driveEnabled?: boolean }>("/api/bootstrap");
  const url = `/api/shopping-list/${week}`, query = useApiQuery<ShoppingItem[]>(url), client = useQueryClient();
  const { toast, online } = useApp();
  const action = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      if (!online) throw new Error("Reconnectez-vous pour modifier les courses.");
      return api(`/api/shopping-list/items/${id}`, "PATCH", { checked });
    },
    onMutate: async ({ id, checked }) => {
      await client.cancelQueries({ queryKey: [url] });
      const previous = client.getQueryData<ShoppingItem[]>([url]);
      client.setQueryData<ShoppingItem[]>([url], rows => rows?.map(i => i.id === id ? { ...i, checked } : i));
      return { previous, url };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) client.setQueryData([context.url], context.previous);
      toast(error.message);
    },
    onSettled: (_data, _error, _variables, context) => client.invalidateQueries({ queryKey: [context?.url ?? url] }),
  });
  const items = query.data ?? [], checked = items.filter(i => i.checked).length, manual = items.filter(i => i.manual).length;
  const visible = items.filter(i => filter === "manual" ? i.manual : filter === "remaining" ? !i.checked : true);
  const categories = [...new Set(visible.map(i => i.category))];
  const add = () => setEditor({ item: null, week });
  return <>
    <PageHeading eyebrow="Le marché, et les petits indispensables" title="Dans notre panier." text="Les ingrédients du menu et vos produits du quotidien, dans une liste partagée.">
      <div className="shopping-heading-actions"><button className="button" onClick={add} disabled={!online}><Plus size={18} />Ajouter un produit</button><Link className="button secondary" to={`/imprimer/courses?week=${week}`}><Printer size={18} />Imprimer</Link></div>
    </PageHeading>
    {feature.data?.driveEnabled && <div className="filter-pills" aria-label="Vue des courses"><button aria-pressed={!driveTab} className={!driveTab ? "selected" : ""} onClick={() => setDriveTab(false)}>Notre liste</button><button aria-pressed={driveTab} className={driveTab ? "selected" : ""} onClick={() => setDriveTab(true)}>E.Leclerc Drive</button></div>}
    {driveTab && feature.data?.driveEnabled ? <DrivePanel key={week} week={week} /> : <>
      <div className="toolbar"><WeekNavigation week={week} setWeek={week => setParams({ week })} /><span className="shopping-shared"><Leaf size={15} />Une liste pour toute la maison</span></div>
      <QueryState pending={query.isPending} error={query.error} retry={() => void query.refetch()} />
      {items.length > 0 && <>
        <div className="shopping-progress"><div><span><ShoppingBasket size={21} /><b>{items.length - checked ? `${items.length - checked} article${items.length - checked > 1 ? "s" : ""} à prendre` : "Tout est dans le panier !"}</b></span><small>{checked} sur {items.length} cochés · {manual} ajout{manual > 1 ? "s" : ""} du foyer</small></div><progress aria-label="Avancement des courses" value={checked} max={items.length} /></div>
        <div className="filter-pills shopping-filters" aria-label="Filtrer les produits">{([["all", "Tout", items.length], ["remaining", "À prendre", items.length - checked], ["manual", "Nos ajouts", manual]] as const).map(([value, label, count]) => <button key={value} className={filter === value ? "selected" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>)}</div>
        <div className="shopping-grid">{categories.map(category => <section className="shopping-category" key={category}><h2>{category}<span>{visible.filter(i => i.category === category).length}</span></h2>{visible.filter(i => i.category === category).map(item => <div className={`shopping-entry ${item.checked ? "checked" : ""}`} key={item.id}>
          <label className={`shopping-row ${item.checked ? "checked" : ""}`}><input type="checkbox" aria-label={`Cocher ${item.name}`} checked={item.checked} disabled={action.isPending || !online} onChange={e => action.mutate({ id: item.id, checked: e.target.checked })} /><span className="custom-check">{item.checked && <Check size={15} />}</span><span className="shopping-product"><span className="shopping-name">{item.name}</span>{item.manual && <small>Notre ajout</small>}</span><strong>{displayQuantity(item.quantity, item.unit)}</strong></label>
          {item.manual && <button className="icon-button shopping-edit" aria-label={`Modifier ${item.name}`} disabled={!online} onClick={() => setEditor({ item, week })}><Pencil size={16} /></button>}
        </div>)}</section>)}</div>
        {!visible.length && <div className="shopping-filter-empty"><Check size={28} /><h2>{filter === "remaining" ? "Les courses sont prêtes." : "Vos petits indispensables."}</h2><p>{filter === "remaining" ? "Tous les articles de cette semaine sont cochés." : "Ajoutez ce qu’il vous faut en plus des recettes."}</p>{filter === "manual" && <button className="button" disabled={!online} onClick={add}><Plus size={18} />Ajouter un produit</button>}</div>}
        <p className="small-note">Les ingrédients suivent votre menu. Vos ajouts restent dans cette semaine. Une quantité modifiée est remise à cocher.</p>
      </>}
      {!items.length && !query.isPending && !query.error && <div className="empty-state shopping-empty"><ShoppingBasket size={36} /><h2>On prépare notre panier ?</h2><p>Ajoutez vos produits dès maintenant. Les ingrédients arriveront automatiquement lorsque vous préparerez le menu.</p><button className="button" disabled={!online} onClick={add}><Plus size={18} />Ajouter notre premier produit</button><Link className="text-button" to={`/?week=${week}`}>Préparer le menu de la semaine</Link></div>}
    </>}
    {editor && <ProductEditor item={editor.item} week={editor.week} onClose={() => setEditor(null)} />}
  </>;
}
