import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Pencil } from "lucide-react";
import { api } from "../../lib/api";

type Affectation = { classe_id: number; classe_nom: string; niveau_nom: string; matiere_id: number; matiere_nom: string };
type Periode = { id: number; nom: string; date_debut: string; date_fin: string };
type EvaluationRecap = { id: number; titre: string; type: "devoir" | "interrogation" | "composition"; date_evaluation: string; coefficient: number };
type EleveRecap = { eleve_id: number; nom: string; prenom: string; matricule: string; notes: Record<number, number | null>; moyenne: number | null };
type Recap = { evaluations: EvaluationRecap[]; eleves: EleveRecap[] };

function libelleType(type: string) {
  if (type === "composition") return "Composition";
  if (type === "interrogation") return "Interrogation";
  return "Devoir";
}

// null = rien d'ouvert, "nouvelle" = formulaire de création, number = id de l'évaluation en saisie
type PanneauOuvert = null | "nouvelle" | number;

export default function EnseignantNotes() {
  const queryClient = useQueryClient();
  const [combo, setCombo] = useState<string>("");
  const [periodeId, setPeriodeId] = useState<string>("");
  const [panneau, setPanneau] = useState<PanneauOuvert>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const { data: affectations } = useQuery<Affectation[]>({
    queryKey: ["mes-affectations"],
    queryFn: async () => (await api.get("/mon-espace/mes-affectations")).data,
  });

  const { data: periodes } = useQuery<Periode[]>({
    queryKey: ["periodes"],
    queryFn: async () => (await api.get("/periodes")).data,
  });

  const [classeId, matiereId] = combo ? combo.split("-").map(Number) : [null, null];

  const { data: recap } = useQuery<Recap>({
    queryKey: ["recap-notes", combo, periodeId],
    queryFn: async () => (await api.get(`/notes/recap?classe_id=${classeId}&matiere_id=${matiereId}&periode_id=${periodeId}`)).data,
    enabled: !!combo && !!periodeId,
  });

  const evaluationEnEdition = typeof panneau === "number" ? recap?.evaluations.find((e) => e.id === panneau) : null;

  const TOUS_LES_TYPES = [
    { valeur: "devoir", libelle: "Devoir" },
    { valeur: "interrogation", libelle: "Interrogation" },
    { valeur: "composition", libelle: "Composition" },
  ] as const;
  const typesUtilises = new Set(recap?.evaluations.map((e) => e.type) ?? []);
  const typesDisponibles = TOUS_LES_TYPES.filter((t) => !typesUtilises.has(t.valeur));

  const creerEvaluation = useMutation({
    mutationFn: async (payload: { titre: string; type: string; date_evaluation: string }) =>
      api.post("/evaluations", {
        classe_id: classeId,
        matiere_id: matiereId,
        periode_id: Number(periodeId),
        titre: payload.titre,
        type: payload.type,
        date_evaluation: payload.date_evaluation,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recap-notes", combo, periodeId] });
      setErreur(null);
      setPanneau(null);
    },
    onError: (error: unknown) => {
      const reponse = (error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data;
      const premierMessage = reponse?.errors ? Object.values(reponse.errors)[0]?.[0] : reponse?.message;
      setErreur(premierMessage ?? "Impossible de créer cette évaluation.");
    },
  });

  const enregistrerNotes = useMutation({
    mutationFn: async ({ evaluationId, notes }: { evaluationId: number; notes: { eleve_id: number; valeur: string; appreciation: string }[] }) =>
      api.post(`/evaluations/${evaluationId}/notes`, {
        notes: notes.map((n) => ({
          eleve_id: n.eleve_id,
          valeur: n.valeur === "" ? null : Number(n.valeur),
          appreciation: n.appreciation || null,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recap-notes", combo, periodeId] });
      setErreur(null);
      setPanneau(null);
    },
    onError: () => setErreur("Impossible d'enregistrer les notes."),
  });

  function handleChangerCombo(valeur: string) {
    setCombo(valeur);
    setPanneau(null);
  }

  function handleSubmitEvaluation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    creerEvaluation.mutate({
      titre: String(f.get("titre")),
      type: String(f.get("type")),
      date_evaluation: String(f.get("date_evaluation")),
    });
  }

  function handleSubmitNotes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!recap || typeof panneau !== "number") return;
    const f = new FormData(e.currentTarget);
    const notes = recap.eleves.map((el) => ({
      eleve_id: el.eleve_id,
      valeur: String(f.get(`valeur-${el.eleve_id}`) ?? ""),
      appreciation: String(f.get(`appreciation-${el.eleve_id}`) ?? ""),
    }));
    enregistrerNotes.mutate({ evaluationId: panneau, notes });
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Notes</h1>

      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Classe et matière</label>
          <select
            value={combo}
            onChange={(e) => handleChangerCombo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Choisir...</option>
            {affectations?.map((a) => (
              <option key={`${a.classe_id}-${a.matiere_id}`} value={`${a.classe_id}-${a.matiere_id}`}>
                {a.classe_nom} ({a.niveau_nom}) — {a.matiere_nom}
              </option>
            ))}
          </select>
          {affectations?.length === 0 && (
            <p className="mt-2 text-sm text-amber-600">Aucune affectation pour l'instant — la direction doit d'abord t'assigner à une classe.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Période</label>
          <select
            value={periodeId}
            onChange={(e) => {
              setPeriodeId(e.target.value);
              setPanneau(null);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Choisir...</option>
            {periodes?.map((p) => (
              <option key={p.id} value={p.id}>{p.nom}</option>
            ))}
          </select>
          {periodes?.length === 0 && (
            <p className="mt-2 text-sm text-amber-600">Aucune période créée — le secrétariat doit d'abord en créer une.</p>
          )}
        </div>
      </div>

      {combo && !periodeId && (
        <p className="mb-6 text-sm text-slate-400">Choisis aussi une période pour afficher le tableau des notes.</p>
      )}

      {combo && periodeId && recap && (
        <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <span className="text-sm font-medium text-ink">Tableau récapitulatif</span>
            <button
              onClick={() => setPanneau(panneau === "nouvelle" ? null : "nouvelle")}
              disabled={panneau !== "nouvelle" && typesDisponibles.length === 0}
              title={typesDisponibles.length === 0 ? "Les 3 types d'évaluation existent déjà pour cette période" : undefined}
              className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {panneau === "nouvelle" ? <X size={14} /> : <Plus size={14} />}
              {panneau === "nouvelle" ? "Fermer" : "Nouvelle évaluation"}
            </button>
          </div>

          {recap.eleves.length === 0 ? (
            <div className="px-5 py-4 text-sm text-slate-400">Aucun élève inscrit dans cette classe.</div>
          ) : recap.evaluations.length === 0 ? (
            <div className="px-5 py-4 text-sm text-slate-400">
              Aucune évaluation créée pour l'instant — clique sur "Nouvelle évaluation" pour commencer.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium">Élève</th>
                  {recap.evaluations.map((ev) => (
                    <th key={ev.id} className="px-3 py-2 text-center font-medium">
                      <div className="flex items-center justify-center gap-1.5">
                        <div>
                          <div>{ev.titre}</div>
                          <div className="font-normal text-slate-400">{libelleType(ev.type)} · coef. {ev.coefficient}</div>
                        </div>
                        <button
                          onClick={() => setPanneau(panneau === ev.id ? null : ev.id)}
                          title="Saisir les notes"
                          className="text-slate-400 transition hover:text-ink"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-2 text-center font-medium">Moyenne</th>
                </tr>
              </thead>
              <tbody>
                {recap.eleves.map((el, idx) => (
                  <tr key={el.eleve_id} className={idx < recap.eleves.length - 1 ? "border-b border-slate-50" : ""}>
                    <td className="px-4 py-2 text-slate-800">{el.prenom} {el.nom}</td>
                    {recap.evaluations.map((ev) => (
                      <td key={ev.id} className="px-3 py-2 text-center text-slate-600">
                        {el.notes[ev.id] ?? <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center font-medium text-ink">
                      {el.moyenne ?? <span className="font-normal text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {panneau === "nouvelle" && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <span className="text-sm font-medium text-ink">Nouvelle évaluation</span>
            <button onClick={() => setPanneau(null)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmitEvaluation} className="grid grid-cols-2 gap-3 px-5 py-4">
            <input name="titre" required placeholder="Titre (ex: Devoir 3)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select name="type" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {typesDisponibles.map((t) => (
                <option key={t.valeur} value={t.valeur}>{t.libelle}</option>
              ))}
            </select>
            <input name="date_evaluation" type="date" required className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <p className="col-span-2 text-xs text-slate-400">
              Le coefficient est repris automatiquement de celui déjà réglé pour cette matière à ce niveau. Un seul devoir, une seule interrogation et une seule composition sont autorisés par période.
            </p>
            {typesDisponibles.length === 0 && (
              <p className="col-span-2 text-sm text-amber-600">
                Les 3 types d'évaluation ont déjà été créés pour cette période — modifie ou supprime-en une existante pour la remplacer.
              </p>
            )}
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={creerEvaluation.isPending || typesDisponibles.length === 0}
                className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
              >
                {creerEvaluation.isPending ? "Création..." : "Créer l'évaluation"}
              </button>
              <button
                type="button"
                onClick={() => setPanneau(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>
          </form>
        </div>
      )}

      {typeof panneau === "number" && recap && evaluationEnEdition && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <span className="text-sm font-medium text-ink">
              Saisie des notes — {evaluationEnEdition.titre}
            </span>
            <button onClick={() => setPanneau(null)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmitNotes}>
            {recap.eleves.map((el, idx) => (
              <div
                key={el.eleve_id}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm ${
                  idx < recap.eleves.length - 1 ? "border-b border-slate-100" : ""
                }`}
              >
                <span className="w-52 shrink-0 text-slate-800">{el.prenom} {el.nom}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    name={`valeur-${el.eleve_id}`}
                    type="number"
                    step="0.25"
                    min="0"
                    max="20"
                    defaultValue={el.notes[panneau] ?? ""}
                    className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm"
                  />
                  <span className="text-slate-400">/20</span>
                </div>
                <input
                  name={`appreciation-${el.eleve_id}`}
                  placeholder="Appréciation (optionnel)"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
            ))}
            <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="submit"
                disabled={enregistrerNotes.isPending}
                className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
              >
                {enregistrerNotes.isPending ? "Enregistrement..." : "Enregistrer les notes"}
              </button>
              <button
                type="button"
                onClick={() => setPanneau(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}