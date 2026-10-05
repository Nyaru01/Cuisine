import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Recipe, Settings } from "../../shared/types";
import { api, HttpError } from "../services/api";
interface AppContextValue {
  recipes: Recipe[];
  settings: Settings;
  favorites: string[];
  openRecipe: (id: string) => void;
  recipeId: string | null;
  closeRecipe: () => void;
  toast: (message: string) => void;
  online: boolean;
}
const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppProvider manquant");
  return context;
}
export function useApiQuery<T>(url: string) {
  return useQuery<T, Error>({
    queryKey: [url],
    queryFn: () => api<T>(url),
    refetchInterval: 15000,
    retry: 1,
  });
}
export function useAction<T = unknown>(success: string) {
  const client = useQueryClient(),
    { toast, online } = useApp();
  return useMutation({
    mutationFn: async ({
      url,
      method = "POST",
      body,
    }: {
      url: string;
      method?: string;
      body?: unknown;
    }) => {
      if (!online)
        throw new Error("Reconnectez-vous pour modifier les données du foyer.");
      return api<T>(url, method, body);
    },
    onSuccess: async () => {
      await client.invalidateQueries();
      if (success) toast(success);
    },
    onError: async (error: Error) => {
      toast(error.message);
      if (error instanceof HttpError && error.status === 409)
        await client.invalidateQueries();
    },
  });
}
export function AppProvider({ children }: { children: ReactNode }) {
  const recipes = useApiQuery<Recipe[]>("/api/recipes"),
    settings = useApiQuery<Settings>("/api/settings"),
    favorites = useApiQuery<string[]>("/api/favorites");
  const [recipeId, setRecipeId] = useState<string | null>(null),
    [message, setMessage] = useState(""),
    [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5500);
    return () => clearTimeout(timer);
  }, [message]);
  if (recipes.isPending || settings.isPending || favorites.isPending)
    return (
      <div className="initial-loading">
        <span className="brand">
          À Table<span>!</span>
        </span>
        <div className="skeleton" />
        <p>On prépare votre table…</p>
      </div>
    );
  const error = recipes.error || settings.error || favorites.error;
  if (error || !recipes.data || !settings.data || !favorites.data)
    return (
      <div className="initial-loading">
        <h1>La table n’est pas encore prête</h1>
        <p>{error?.message}</p>
        <button onClick={() => location.reload()}>Réessayer</button>
      </div>
    );
  return (
    <AppContext.Provider
      value={{
        recipes: recipes.data,
        settings: settings.data,
        favorites: favorites.data,
        openRecipe: setRecipeId,
        recipeId,
        closeRecipe: () => setRecipeId(null),
        toast: setMessage,
        online,
      }}
    >
      {!online && (
        <div className="offline-banner" role="status">
          Hors connexion · vos dernières données consultées · modifications à la
          reconnexion
        </div>
      )}
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </AppContext.Provider>
  );
}
