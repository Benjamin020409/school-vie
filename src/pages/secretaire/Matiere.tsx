import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "../../lib/api";

type MatiereAvecPivot = { id: number; nom: string; pivot: { coefficient: string | number; heures_semaine: string | number } };
type Niveau = { id: number; nom: string; matieres?: MatiereAvecPivot[] };
type Matiere = { id: number; nom: string };

export default function SecretaireMatieres() {
  const queryClient = useQueryClient();

  const { data: matieres } = useQuery<Matiere[]>({
    queryKey: ["matieres"],
    queryFn: async () => (await api.get("/matieres")).data,
  });

  const { data: niveaux } = useQuery<Niveau[]>({
    queryKey: ["niveaux"],
    queryFn: async () => (await api.get("/niveaux")).data,
  });

  const [erreur, setErreur] = useState<string | null>(null);
  const [niveauSelectionne, setNiveauSelectionne] = useState<string>("");
  // matiere_id -> { cochee, coefficient, heuresSemaine }
  const [selection, setSelection] = useState<Map<number, { cochee: boolean; coefficient: number; heuresSemaine: number }>>(new Map());

  // --- Récapitulatif repliable ---
  const [recapOuvert, setRecapOuvert] = useState(false);
  const [rechercheNiveau, setRechercheNiveau] = useState("");
  const [niveauRecapId, setNiveauRecapId] = useState<number | null>(null);
  const [editionMatiereId, setEditionMatiereId] = useState<number | null>(null);
  const [coefficientEdition, setCoefficientEdition] = useState<number>(1);
  const [heuresEdition, setHeuresEdition] = useState<number>(2);

  function fermerRecap() {
    setRecapOuvert(false);
    setRechercheNiveau("");
    setNiveauRecapId(null);
    setEditionMatiereId(null);
  }

  const niveauRecap = niveaux?.find((n) => n.id === niveauRecapId) ?? null;

  const niveauxSuggeres = (niveaux ?? []).filter(
    (n) => rechercheNiveau.trim() !== "" && n.nom.toLowerCase().includes(rechercheNiveau.trim().toLowerCase())
  );

  const modifierAffectationNiveau = useMutation({
    mutationFn: async ({ niveauId, matieresPayload }: { niveauId: number; matieresPayload: { id: number; coefficient: number; heures_semaine: number }[] }) =>
      api.put(`/niveaux/${niveauId}/matieres`, { matieres: matieresPayload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["niveaux"] });
      setErreur(null);
      setEditionMatiereId(null);
    },
    onError: () => setErreur("Impossible de mettre à jour cette affectation."),
  });

  function listeCourante(niveau: Niveau) {
    return (niveau.matieres ?? []).map((m) => ({
      id: m.id,
      coefficient: Number(m.pivot.coefficient),
      heures_semaine: Number(m.pivot.heures_semaine),
    }));
  }

  function handleEnregistrerModification(niveau: Niveau, matiereId: number) {
    const payload = listeCourante(niveau).map((m) =>
      m.id === matiereId ? { ...m, coefficient: coefficientEdition, heures_semaine: heuresEdition } : m
    );
    modifierAffectationNiveau.mutate({ niveauId: niveau.id, matieresPayload: payload });
  }

  function handleSupprimer(niveau: Niveau, matiereId: number) {
    if (!confirm("Retirer cette matière de ce niveau ?")) return;
    const payload = listeCourante(niveau).filter((m) => m.id !== matiereId);
    modifierAffectationNiveau.mutate({ niveauId: niveau.id, matieresPayload: payload });
  }

  useEffect(() => {
    if (!niveauSelectionne || !niveaux || !matieres) {
      setSelection(new Map());
      return;
    }
    const niveau = niveaux.find((n) => n.id === Number(niveauSelectionne));
    const carte = new Map<number, { cochee: boolean; coefficient: number; heuresSemaine: number }>();
    matieres.forEach((m) => {
      const assignee = niveau?.matieres?.find((nm) => nm.id === m.id);
      carte.set(m.id, {
        cochee: !!assignee,
        coefficient: assignee ? Number(assignee.pivot.coefficient) : 1,
        heuresSemaine: assignee ? Number(assignee.pivot.heures_semaine) : 2,
      });
    });
    setSelection(carte);
  }, [niveauSelectionne, niveaux, matieres]);

  const creerMatiere = useMutation({
    mutationFn: async (payload: { nom: string }) => api.post("/matieres", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matieres"] });
      setErreur(null);
    },
    onError: () => setErreur("Cette matière existe déjà."),
  });

  const enregistrerAffectation = useMutation({
    mutationFn: async () => {
      const payload = Array.from(selection.entries())
        .filter(([, v]) => v.cochee)
        .map(([id, v]) => ({ id, coefficient: v.coefficient, heures_semaine: v.heuresSemaine }));

      return api.put(`/niveaux/${niveauSelectionne}/matieres`, { matieres: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["niveaux"] });
      setErreur(null);
    },
    onError: () => setErreur("Impossible d'enregistrer l'affectation."),
  });

  function toggleMatiere(id: number) {
    setSelection((prev) => {
      const suivant = new Map(prev);
      const actuel = suivant.get(id) ?? { cochee: false, coefficient: 1, heuresSemaine: 2 };
      suivant.set(id, { ...actuel, cochee: !actuel.cochee });
      return suivant;
    });
  }

  function changerCoefficient(id: number, coefficient: number) {
    setSelection((prev) => {
      const suivant = new Map(prev);
      const actuel = suivant.get(id) ?? { cochee: true, coefficient: 1, heuresSemaine: 2 };
      suivant.set(id, { ...actuel, coefficient });
      return suivant;
    });
  }

  function changerHeuresSemaine(id: number, heuresSemaine: number) {
    setSelection((prev) => {
      const suivant = new Map(prev);
      const actuel = suivant.get(id) ?? { cochee: true, coefficient: 1, heuresSemaine: 2 };
      suivant.set(id, { ...actuel, heuresSemaine });
      return suivant;
    });
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Matières</h1>

      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Toutes les matières
        </div>
        <div className="flex flex-wrap gap-2 px-5 py-3">
          {matieres?.length === 0 && <span className="text-sm text-slate-400">Aucune matière créée.</span>}
          {matieres?.map((m) => (
            <span key={m.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {m.nom}
            </span>
          ))}
        </div>
        <form
          className="flex flex-wrap items-end gap-3 border-t border-slate-100 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            creerMatiere.mutate({ nom: String(f.get("nom")) });
            e.currentTarget.reset();
          }}
        >
          <input name="nom" required placeholder="ex: Mathématiques" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-ink-light">
            <Plus size={14} /> Ajouter
          </button>
        </form>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <span className="text-sm font-medium text-ink">Récapitulatif des coefficients et volumes horaires</span>
          {!recapOuvert ? (
            <button
              onClick={() => setRecapOuvert(true)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50"
            >
              Afficher
            </button>
          ) : (
            <button
              onClick={fermerRecap}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50"
            >
              Fermer
            </button>
          )}
        </div>

        {recapOuvert && (
          <div className="px-5 py-4">
            <input
              value={rechercheNiveau}
              onChange={(e) => {
                setRechercheNiveau(e.target.value);
                setNiveauRecapId(null);
              }}
              placeholder="Rechercher un niveau (ex: 6ème)..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            />

            {rechercheNiveau.trim() !== "" && !niveauRecapId && (
              <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">
                {niveauxSuggeres.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-400">Aucun niveau ne correspond.</div>
                )}
                {niveauxSuggeres.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setNiveauRecapId(n.id);
                      setRechercheNiveau(n.nom);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {n.nom}
                  </button>
                ))}
              </div>
            )}

            {niveauRecap && (
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                      <th className="px-4 py-2 font-medium">Matière</th>
                      <th className="px-4 py-2 text-center font-medium">Coefficient</th>
                      <th className="px-4 py-2 text-center font-medium">Heures/semaine</th>
                      <th className="px-4 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(niveauRecap.matieres ?? []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm text-slate-400">
                          Aucune matière assignée à ce niveau pour l'instant.
                        </td>
                      </tr>
                    )}
                    {(niveauRecap.matieres ?? []).map((m) => (
                      <tr key={m.id} className="border-b border-slate-50 last:border-b-0">
                        <td className="px-4 py-2 text-slate-800">{m.nom}</td>
                        <td className="px-4 py-2 text-center text-slate-600">
                          {editionMatiereId === m.id ? (
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              value={coefficientEdition}
                              onChange={(e) => setCoefficientEdition(Number(e.target.value))}
                              className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm"
                            />
                          ) : (
                            Number(m.pivot.coefficient)
                          )}
                        </td>
                        <td className="px-4 py-2 text-center text-slate-600">
                          {editionMatiereId === m.id ? (
                            <input
                              type="number"
                              min="1"
                              max="15"
                              value={heuresEdition}
                              onChange={(e) => setHeuresEdition(Number(e.target.value))}
                              className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm"
                            />
                          ) : (
                            `${Number(m.pivot.heures_semaine)}h`
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {editionMatiereId === m.id ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEnregistrerModification(niveauRecap, m.id)}
                                disabled={modifierAffectationNiveau.isPending}
                                className="rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-white hover:bg-ink-light disabled:opacity-60"
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={() => setEditionMatiereId(null)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditionMatiereId(m.id);
                                  setCoefficientEdition(Number(m.pivot.coefficient));
                                  setHeuresEdition(Number(m.pivot.heures_semaine));
                                }}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-ink hover:bg-slate-50"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleSupprimer(niveauRecap, m.id)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                              >
                                Supprimer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Matières enseignées par niveau — coefficient et volume horaire propres à chaque niveau
        </div>
        <div className="px-5 py-4">
          <select
            value={niveauSelectionne}
            onChange={(e) => setNiveauSelectionne(e.target.value)}
            className="mb-4 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Choisir un niveau...</option>
            {niveaux?.map((n) => <option key={n.id} value={n.id}>{n.nom}</option>)}
          </select>

          {!niveauSelectionne && (
            <p className="text-sm text-slate-400">Sélectionne un niveau pour voir/modifier ses matières, coefficients et volumes horaires.</p>
          )}
          {niveaux?.length === 0 && (
            <p className="text-sm text-amber-600">Aucun niveau créé — va d'abord dans l'onglet Classes pour en créer.</p>
          )}

          {niveauSelectionne && (
            <>
              <div className="mb-4 space-y-2">
                {matieres?.length === 0 && (
                  <p className="text-sm text-slate-400">Crée d'abord des matières ci-dessus.</p>
                )}
                {matieres?.map((m) => {
                  const etat = selection.get(m.id) ?? { cochee: false, coefficient: 1, heuresSemaine: 2 };
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <label className="flex flex-1 items-center gap-2 text-sm">
                        <input type="checkbox" checked={etat.cochee} onChange={() => toggleMatiere(m.id)} />
                        {m.nom}
                      </label>
                      {etat.cochee && (
                        <>
                          <label className="flex items-center gap-1.5 text-xs text-slate-500">
                            Coefficient
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              value={etat.coefficient}
                              onChange={(e) => changerCoefficient(m.id, Number(e.target.value))}
                              className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                            />
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-500">
                            Heures/semaine
                            <input
                              type="number"
                              min="1"
                              max="15"
                              value={etat.heuresSemaine}
                              onChange={(e) => changerHeuresSemaine(m.id, Number(e.target.value))}
                              className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                            />
                          </label>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => enregistrerAffectation.mutate()}
                disabled={enregistrerAffectation.isPending}
                className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
              >
                {enregistrerAffectation.isPending ? "Enregistrement..." : "Enregistrer l'affectation"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}