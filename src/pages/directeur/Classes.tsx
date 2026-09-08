import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

type MatiereAvecPivot = { id: number; nom: string; pivot: { coefficient: string | number } };
type Niveau = { id: number; nom: string; matieres?: MatiereAvecPivot[] };
type Classe = { id: number; nom: string; niveau: { id: number; nom: string }; capacite_max: number | null };
type Enseignant = {
  id: number;
  nom: string;
  prenom: string;
  affectations: { matiere: { id: number; nom: string }; classe: { id: number } }[];
};

export default function DirecteurClasses() {
  const [classeSelectionneeId, setClasseSelectionneeId] = useState<string>("");

  const { data: classes } = useQuery<Classe[]>({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data,
  });

  const { data: niveaux } = useQuery<Niveau[]>({
    queryKey: ["niveaux"],
    queryFn: async () => (await api.get("/niveaux")).data,
  });

  const { data: enseignants } = useQuery<Enseignant[]>({
    queryKey: ["enseignants"],
    queryFn: async () => (await api.get("/enseignants")).data,
  });

  const classeSelectionnee = classes?.find((c) => c.id === Number(classeSelectionneeId)) ?? null;
  const niveauDeLaClasse = niveaux?.find((n) => n.id === classeSelectionnee?.niveau.id) ?? null;

  function trouverEnseignant(matiereId: number) {
    if (!classeSelectionnee || !enseignants) return null;
    for (const e of enseignants) {
      const match = e.affectations.find(
        (a) => a.classe.id === classeSelectionnee.id && a.matiere.id === matiereId
      );
      if (match) return `${e.prenom} ${e.nom}`;
    }
    return null;
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Classes</h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <label className="mb-1 block text-xs font-medium text-slate-600">Choisir une classe</label>
        <select
          value={classeSelectionneeId}
          onChange={(e) => setClasseSelectionneeId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Sélectionner...</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>{c.nom} ({c.niveau.nom})</option>
          ))}
        </select>
      </div>

      {!classeSelectionneeId && (
        <p className="text-sm text-slate-400">Choisis une classe pour voir le détail de son enseignement.</p>
      )}

      {classeSelectionnee && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
            {classeSelectionnee.nom} — {classeSelectionnee.niveau.nom}
            {classeSelectionnee.capacite_max && (
              <span className="ml-2 text-xs font-normal text-slate-400">
                (capacité max. {classeSelectionnee.capacite_max})
              </span>
            )}
          </div>

          {(niveauDeLaClasse?.matieres ?? []).length === 0 ? (
            <div className="px-5 py-4 text-sm text-slate-400">
              Aucune matière assignée au niveau {classeSelectionnee.niveau.nom}.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-5 py-2 font-medium">Matière</th>
                  <th className="px-5 py-2 text-center font-medium">Coefficient</th>
                  <th className="px-5 py-2 font-medium">Enseignant</th>
                </tr>
              </thead>
              <tbody>
                {niveauDeLaClasse!.matieres!.map((m) => {
                  const enseignant = trouverEnseignant(m.id);
                  return (
                    <tr key={m.id} className="border-b border-slate-50 last:border-b-0">
                      <td className="px-5 py-2.5 text-slate-800">{m.nom}</td>
                      <td className="px-5 py-2.5 text-center text-slate-600">{Number(m.pivot.coefficient)}</td>
                      <td className="px-5 py-2.5">
                        {enseignant ? (
                          <span className="text-slate-800">{enseignant}</span>
                        ) : (
                          <span className="text-amber-600">Non assigné</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}