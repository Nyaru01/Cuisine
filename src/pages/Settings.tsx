import { useState } from "react";
import { Users, Plus, Trash2, Save, LogOut, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useApp, useAction } from "../hooks/app";
import { PageHeading } from "../components/common";
import { adultEquivalent } from "../../shared/domain";
import { clearCache } from "../services/api";
export default function Settings() {
  const { settings } = useApp(),
    [draft, setDraft] = useState(settings),
    [dislikes, setDislikes] = useState(settings.dislikes.join(", ")),
    [exclusions, setExclusions] = useState(settings.exclusions.join(", ")),
    action = useAction("Les réglages du foyer sont enregistrés."),
    client = useQueryClient();
  const split = (s: string) => [
    ...new Set(
      s
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  return (
    <>
      <PageHeading
        eyebrow="Chaque famille a sa recette"
        title="Notre petite tribu."
        text="Les bonnes quantités, les goûts de chacun et une cuisine qui vous ressemble."
      />
      <form
        className="settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          action.mutate({
            url: "/api/settings",
            method: "PATCH",
            body: {
              ...draft,
              dislikes: split(dislikes),
              exclusions: split(exclusions),
            },
          });
        }}
      >
        <section className="settings-panel">
          <h2>
            <Users size={22} />À la maison
          </h2>
          <label className="field">
            Nombre d’adultes
            <input
              type="number"
              min="1"
              max="10"
              required
              value={draft.household.adults}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  household: {
                    ...draft.household,
                    adults: Number(e.target.value),
                  },
                })
              }
            />
          </label>
          <div className="children-list">
            {draft.household.children.map((child, index) => (
              <div className="child-row" key={index}>
                <label className="field">
                  Enfant {index + 1} · âge
                  <input
                    type="number"
                    min="0"
                    max="17"
                    required
                    value={child.age}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        household: {
                          ...draft.household,
                          children: draft.household.children.map((c, i) =>
                            i === index ? { age: Number(e.target.value) } : c,
                          ),
                        },
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Retirer l’enfant ${index + 1}`}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      household: {
                        ...draft.household,
                        children: draft.household.children.filter(
                          (_, i) => i !== index,
                        ),
                      },
                    })
                  }
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <button
            className="text-button"
            type="button"
            disabled={draft.household.children.length >= 10}
            onClick={() =>
              setDraft({
                ...draft,
                household: {
                  ...draft.household,
                  children: [...draft.household.children, { age: 5 }],
                },
              })
            }
          >
            <Plus size={17} />
            Ajouter un enfant
          </button>
          <p className="small-note">
            Votre foyer représente{" "}
            {adultEquivalent(draft.household).toLocaleString("fr-FR")} portions
            adultes pour le calcul des recettes. Les coefficients selon l’âge
            sont des repères culinaires ajustables.
          </p>
        </section>
        <section className="settings-panel">
          <h2>Les goûts de la famille</h2>
          <label className="field">
            Nous n’aimons pas
            <textarea
              rows={2}
              placeholder="Champignons, coriandre…"
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
            />
            <small>Séparez les ingrédients par une virgule.</small>
          </label>
          <label className="field">
            Ingrédients exclus
            <textarea
              rows={2}
              placeholder="Poisson, poivrons…"
              value={exclusions}
              onChange={(e) => setExclusions(e.target.value)}
            />
            <small>
              Ces ingrédients seront écartés des prochaines propositions.
            </small>
          </label>
          <fieldset>
            <legend>Allergies</legend>
            <div className="allergy-options">
              {[
                "gluten",
                "lait",
                "œufs",
                "poisson",
                "soja",
                "moutarde",
                "céleri",
                "sésame",
                "fruits à coque",
                "arachides",
                "crustacés",
                "mollusques",
                "lupin",
                "sulfites",
              ].map((allergen) => (
                <label key={allergen}>
                  <input
                    type="checkbox"
                    checked={draft.allergies.includes(allergen)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        allergies: e.target.checked
                          ? [...draft.allergies, allergen]
                          : draft.allergies.filter((a) => a !== allergen),
                      })
                    }
                  />
                  {allergen}
                </label>
              ))}
            </div>
            <p className="small-note">
              Les filtres s’appuient sur les ingrédients des recettes. Vérifiez
              les étiquettes et les traces éventuelles des produits achetés.
            </p>
          </fieldset>
        </section>
        <section className="settings-panel">
          <h2>Le rythme de la semaine</h2>
          <label className="field">
            Temps de préparation préféré en semaine
            <select
              value={draft.maxPrep}
              onChange={(e) =>
                setDraft({ ...draft, maxPrep: Number(e.target.value) })
              }
            >
              {[15, 20, 30, 45, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} minutes
                </option>
              ))}
            </select>
            <small>Une préférence pour les soirs du lundi au jeudi.</small>
          </label>
          <button className="button" disabled={action.isPending}>
            <Save size={18} />
            {action.isPending ? "Enregistrement…" : "Enregistrer les réglages"}
          </button>
        </section>
      </form>
      <section className="settings-panel install-panel">
        <h2>
          <Download size={20} />
          Toujours à portée de main
        </h2>
        <p>
          Installez À Table ! depuis le menu de votre navigateur. Sur iPhone :
          Partager → Sur l’écran d’accueil. Les pages déjà consultées restent
          lisibles hors connexion.
        </p>
        <button
          className="text-button"
          onClick={async () => {
            const {logoutGoogle}=await import('../services/firebase');
            await logoutGoogle();
            clearCache();
            client.clear();
            location.reload();
          }}
        >
          <LogOut size={17} />
          Fermer la session sur cet appareil
        </button>
      </section>
    </>
  );
}
