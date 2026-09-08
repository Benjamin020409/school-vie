import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, FileDown, RefreshCw } from "lucide-react";
import { api } from "../../lib/api";

type Classe = { id: number; nom: string; niveau: { id: number; nom: string } };
type Niveau = { id: number; nom: string };

async function telechargerEmploiDuTemps(classe: Classe) {
  const response = await api.get(`/classes/${classe.id}/emploi-du-temps-pdf`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `emploi-du-temps-${classe.nom}.pdf`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(url);
}

export default function SecretaireEmploiDuTemps() {
  const queryClient = useQueryClient();
  const [niveauSelectionneId, setNiveauSelectionneId] = useState<string>("");
  const [avertissements, setAvertissements] = useState<string[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [telechargementId, setTelechargementId] = useState<number | null>(null);

  const { data: niveaux } = useQuery<Niveau[]>({
    queryKey: ["niveaux"],
    queryFn: async () => (await api.get("/niveaux")).data,
  });

  const { data: classes } = useQuery<Classe[]>({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data,
  });

  const classesDuNiveau = classes?.filter((c) => c.niveau.id === Number(niveauSelectionneId)) ?? [];

  const genererEmploiDuTemps = useMutation({
    mutationFn: async () => api.post(`/niveaux/${niveauSelectionneId}/generer-emploi-du-temps`),
    onSuccess: ({ data }) => {
      setErreur(null);
      setAvertissements(data.avertissements ?? []);
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: () => {
      setAvertissements(null);
      setErreur("Impossible de générer l'emploi du temps (vérifie qu'une année scolaire est active et que des classes existent pour ce niveau).");
    },
  });

  async function handleTelecharger(classe: Classe) {
    setTelechargementId(classe.id);
    try {
      await telechargerEmploiDuTemps(classe);
    } catch {
      setErreur("Impossible de télécharger ce PDF pour le moment.");
    } finally {
      setTelechargementId(null);
    }
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Emploi du temps</h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-sm text-slate-500">
          Choisis un niveau : les volumes horaires de chaque matière (réglés dans l'onglet Matières) servent de base pour générer
          automatiquement l'emploi du temps de chaque classe de ce niveau, sans jamais qu'un enseignant se retrouve sur deux classes en même temps.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Niveau</label>
            <select
              value={niveauSelectionneId}
              onChange={(e) => {
                setNiveauSelectionneId(e.target.value);
                setAvertissements(null);
                setErreur(null);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Sélectionner...</option>
              {niveaux?.map((n) => (
                <option key={n.id} value={n.id}>{n.nom}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => genererEmploiDuTemps.mutate()}
            disabled={!niveauSelectionneId || genererEmploiDuTemps.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
          >
            <CalendarClock size={15} />
            {genererEmploiDuTemps.isPending ? "Génération..." : "Générer l'emploi du temps"}
          </button>

          {niveauSelectionneId && (
            <button
              onClick={() => genererEmploiDuTemps.mutate()}
              disabled={genererEmploiDuTemps.isPending}
              title="Regénérer si le résultat ne convient pas"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} />
              Regénérer
            </button>
          )}
        </div>

        {erreur && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>
        )}

        {avertissements && avertissements.length > 0 && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <p className="mb-1 font-medium">Génération terminée avec des points à vérifier :</p>
            <ul className="list-inside list-disc space-y-0.5">
              {avertissements.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
        {avertissements && avertissements.length === 0 && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Génération complète — tous les créneaux ont pu être placés sans conflit.
          </p>
        )}
      </div>

      {niveauSelectionneId && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
            Classes de ce niveau
          </div>
          {classesDuNiveau.length === 0 && (
            <div className="px-5 py-4 text-sm text-slate-400">Aucune classe créée pour ce niveau.</div>
          )}
          {classesDuNiveau.map((c, idx) => (
            <div
              key={c.id}
              className={`flex items-center justify-between px-5 py-3 text-sm ${
                idx < classesDuNiveau.length - 1 ? "border-b border-slate-100" : ""
              }`}
            >
              <span className="font-medium text-slate-800">{c.nom}</span>
              <button
                onClick={() => handleTelecharger(c)}
                disabled={telechargementId === c.id}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50 disabled:opacity-60"
              >
                <FileDown size={13} />
                {telechargementId === c.id ? "Génération..." : "Télécharger (PDF)"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}