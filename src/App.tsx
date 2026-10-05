import { lazy, Suspense, useState, useEffect } from "react";
import { NavLink, Routes, Route } from "react-router-dom";
import {
  CalendarDays,
  ShoppingBasket,
  BookOpen,
  Heart,
  Settings2,
  History,
  Leaf,
  ArrowRight,
  Download,
  RefreshCw,
} from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useRegisterSW } from "virtual:pwa-register/react";
import { AppProvider } from "./hooks/app";
import { RecipeDetail } from "./components/RecipeDetail";
import { api } from "./services/api";
import { loginGoogle, logoutGoogle, observeIdentity } from "./services/firebase";
import { seasonFor, parisToday } from "../shared/domain";
import type { Recipe, Settings as FamilySettings, Plan } from "../shared/types";
import Week from "./pages/Week";
const Shopping = lazy(() => import("./pages/Shopping")),
  Recipes = lazy(() => import("./pages/Recipes")),
  Settings = lazy(() => import("./pages/Settings")),
  HistoryPage = lazy(() => import("./pages/History")),
  Print = lazy(() => import("./pages/Print"));
const links = [
  ["/", "Semaine", CalendarDays],
  ["/courses", "Courses", ShoppingBasket],
  ["/recettes", "Recettes", BookOpen],
  ["/favoris", "Favoris", Heart],
  ["/reglages", "Réglages", Settings2],
] as const;
interface Auth {
  enabled: boolean;
  authenticated: boolean;
  recipes?: Recipe[];
  settings?: FamilySettings;
  favorites?: string[];
  plan?: Plan;
}
export function Login() {
  const {needRefresh:[needRefresh],updateServiceWorker}=useRegisterSW();
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    client = useQueryClient();
  return (
    <div className="login-page">
      <div className="login-art">
        <img className="login-photo" src="/images/family-table.webp" alt="Une table accueillante, du pain et des légumes rôtis à partager" fetchPriority="high" />
        <div className="login-story">
        <span className="brand">
          À Table<span>!</span>
        </span>
        <h1>
          Les bonnes choses
          <br />
          se partagent.
        </h1>
        <p>Une semaine de repas, moins de charge mentale.</p>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError("");
          try {
            await loginGoogle();
            const access=await api<{authenticated:boolean}>('/api/auth');
            if(!access.authenticated){await logoutGoogle();throw new Error('Ce compte Google n’est pas autorisé pour ce foyer.');}
            await client.invalidateQueries();
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Connexion impossible.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <span className="eyebrow">Bienvenue à la maison</span>
        <div className="login-symbol" aria-hidden="true"><Leaf size={26} /></div>
        <h2>Retrouvons notre table.</h2>
        <p>Connectez-vous avec le compte Google d’un membre du foyer.</p>
        {needRefresh && <button type="button" className="button" onClick={()=>void updateServiceWorker(true)}>Actualiser l’application</button>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button google-button" disabled={pending}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36ZM12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.08v2.59A10 10 0 0 0 12 22ZM6.42 13.92a6 6 0 0 1 0-3.84V7.49H3.08a10 10 0 0 0 0 9.02l3.34-2.59ZM12 5.96c1.47 0 2.79.5 3.83 1.51l2.87-2.87A9.61 9.61 0 0 0 12 2a10 10 0 0 0-8.92 5.49l3.34 2.59A6 6 0 0 1 12 5.96Z"/></svg>
          {pending ? "Connexion…" : "Continuer avec Google"}
          <ArrowRight size={18} />
        </button>
        <span className="login-footnote">Votre carnet privé, partagé en famille.</span>
      </form>
    </div>
  );
}
function Layout() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();
  return (
    <AppProvider>
      <div className="app-layout" data-season={seasonFor(parisToday())}>
        <aside className="sidebar">
          <NavLink className="brand" to="/" aria-label="À Table ! Accueil">
            À Table<span>!</span>
          </NavLink>
          <p className="brand-caption">Notre carnet familial</p>
          <div className="nav-label">AU QUOTIDIEN</div>
          <nav aria-label="Navigation principale">
            {links.map(([path, label, Icon]) => (
              <NavLink key={path} to={path} end={path === "/"}>
                <Icon size={20} />
                {label}
              </NavLink>
            ))}
            <NavLink to="/historique">
              <History size={20} />
              Historique
            </NavLink>
          </nav>
          <div className="sidebar-season">
            <Leaf size={24} />
            <strong>Bonjour, {seasonFor(parisToday())}.</strong>
            <p>
              De bons produits.
              <br />
              De belles habitudes.
            </p>
          </div>
          <p className="sidebar-footer">Le bonheur est dans l’assiette.</p>
        </aside>
        <div className="mobile-header">
          <NavLink className="brand" to="/">
            À Table<span>!</span>
          </NavLink>
          <NavLink
            className="icon-button"
            to="/historique"
            aria-label="Historique"
          >
            <History size={21} />
          </NavLink>
        </div>
        <main className="main-content">
          <Suspense fallback={<div className="skeleton" />}>
            <Routes>
              <Route path="/" element={<Week />} />
              <Route path="/courses" element={<Shopping />} />
              <Route path="/recettes" element={<Recipes key="recipes" />} />
              <Route path="/favoris" element={<Recipes key="favorites" favoritesOnly />} />
              <Route path="/reglages" element={<Settings />} />
              <Route path="/historique" element={<HistoryPage />} />
              <Route path="/imprimer/:kind" element={<Print />} />
              <Route
                path="*"
                element={
                  <div className="empty-state">
                    <h1>Ce chemin ne mène pas à la cuisine.</h1>
                    <NavLink to="/">Retour à la semaine</NavLink>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>
        <nav className="mobile-nav" aria-label="Navigation mobile">
          {links.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path === "/"}>
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <RecipeDetail />
        {(needRefresh || offlineReady) && (
          <div className="pwa-notice" role="status">
            {needRefresh ? (
              <>
                <RefreshCw size={18} />
                <span>Une nouvelle version est prête.</span>
                <button onClick={() => void updateServiceWorker(true)}>
                  Actualiser
                </button>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Votre carnet est prêt hors connexion.</span>
              </>
            )}
            <button
              aria-label="Masquer le message"
              onClick={() => {
                setNeedRefresh(false);
                setOfflineReady(false);
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </AppProvider>
  );
}
export default function App() {
  const client = useQueryClient();
  useEffect(()=>{
    let stop:(()=>void)|undefined;
    let disposed=false;
    void observeIdentity(()=>void client.invalidateQueries()).then(unsubscribe=>{if(disposed) unsubscribe(); else stop=unsubscribe;}).catch(()=>{});
    return ()=>{disposed=true; stop?.();};
  },[client]);
  const auth = useQuery<Auth, Error>({
    queryKey: ["/api/bootstrap"],
    queryFn: async () => {
      const data = await api<Auth>("/api/bootstrap");
      if (data.authenticated) {
        if (data.recipes) client.setQueryData(["/api/recipes"], data.recipes);
        if (data.settings)
          client.setQueryData(["/api/settings"], data.settings);
        if (data.favorites)
          client.setQueryData(["/api/favorites"], data.favorites);
        if (data.plan) {
          client.setQueryData(["/api/plans/current"], data.plan);
          client.setQueryData([`/api/plans/${data.plan.week}`], data.plan);
        }
      }
      return data;
    },
    refetchInterval: 15000,
    retry: 1,
  });
  if (auth.isPending)
    return (
      <div className="initial-loading">
        <span className="brand">
          À Table<span>!</span>
        </span>
        <p>Bienvenue à la maison…</p>
      </div>
    );
  if (auth.error)
    return (
      <div className="empty-state">
        <h1>Connexion indisponible</h1>
        <p>{auth.error.message}</p>
        <button className="button" onClick={() => void auth.refetch()}>
          Réessayer
        </button>
      </div>
    );
  return auth.data?.authenticated ? <Layout /> : <Login />;
}
