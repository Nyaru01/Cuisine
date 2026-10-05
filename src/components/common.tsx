import { useEffect, useRef, type ReactNode } from "react";
import { X, Heart, Clock, Leaf, ArrowUpRight } from "lucide-react";
import type { Recipe } from "../../shared/types";
import { useApp, useAction } from "../hooks/app";
export function Dialog({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current!,
      previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      onCancel={() => closeRef.current()}
      onClick={(e) => {
        if (e.target === ref.current) {
          const bounds = ref.current.getBoundingClientRect();
          if (
            e.clientX < bounds.left ||
            e.clientX > bounds.right ||
            e.clientY < bounds.top ||
            e.clientY > bounds.bottom
          )
            closeRef.current();
        }
      }}
      aria-label={title}
    >
      <div className="modal-top">
        <span className="eyebrow">{title}</span>
        <button className="icon-button" onClick={onClose} aria-label="Fermer">
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function FoodImage({
  recipe,
  className = "",
}: {
  recipe: Recipe;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={recipe.image}
      alt={`Illustration du plat : ${recipe.name}`}
      loading="lazy"
      width="640"
      height="420"
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.src.endsWith("/images/vegetables.svg"))
          target.src = "/images/vegetables.svg";
      }}
    />
  );
}
export function FavoriteButton({ recipe }: { recipe: Recipe }) {
  const { favorites } = useApp(),
    action = useAction("Favoris mis à jour"),
    favorite = favorites.includes(recipe.id);
  return (
    <button
      className={`icon-button favorite ${favorite ? "active" : ""}`}
      aria-label={
        favorite
          ? `Retirer ${recipe.name} des favoris`
          : `Ajouter ${recipe.name} aux favoris`
      }
      aria-pressed={favorite}
      disabled={action.isPending}
      onClick={() =>
        action.mutate({
          url: `/api/favorites/${recipe.id}`,
          method: favorite ? "DELETE" : "POST",
        })
      }
    >
      <Heart size={20} fill={favorite ? "currentColor" : "none"} />
    </button>
  );
}
export function RecipeCard({
  recipe,
  onSelect,
}: {
  recipe: Recipe;
  onSelect?: () => void;
}) {
  const { openRecipe } = useApp();
  return (
    <article className="recipe-card">
      <div className="recipe-picture">
        <button
          className="image-button"
          onClick={onSelect ?? (() => openRecipe(recipe.id))}
          aria-label={`Voir ${recipe.name}`}
        >
          <FoodImage recipe={recipe} />
        </button>
        <FavoriteButton recipe={recipe} />
      </div>
      <div className="recipe-card-body">
        <div className="recipe-meta">
          <span>
            <Clock size={14} />
            {recipe.totalTime} min
          </span>
          {recipe.vegetarian && (
            <span>
              <Leaf size={14} />
              Végétarien
            </span>
          )}
        </div>
        <button
          className="recipe-name"
          onClick={onSelect ?? (() => openRecipe(recipe.id))}
        >
          {recipe.name}
          <ArrowUpRight size={18} />
        </button>
        <p>{recipe.description}</p>
        {onSelect && (
          <button className="button secondary full" onClick={onSelect}>
            Choisir ce plat
          </button>
        )}
      </div>
    </article>
  );
}
export function PageHeading({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </header>
  );
}
export function QueryState({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: Error | null;
  retry: () => void;
}) {
  if (pending)
    return (
      <div className="loading-grid" aria-label="Chargement">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    );
  if (error)
    return (
      <div className="empty-state">
        <h2>Un petit contretemps</h2>
        <p>{error.message}</p>
        <button className="button" onClick={retry}>
          Réessayer
        </button>
      </div>
    );
  return null;
}
