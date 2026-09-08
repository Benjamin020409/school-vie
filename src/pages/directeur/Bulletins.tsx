import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { api } from "../../lib/api";

type Classe = { id: number; nom: string; niveau: { id: number; nom: string } };
type Periode = { id: number; nom: string };
type Bulletin = {
  id: number;
  moyenne_generale: number | null;
  rang: number | null;
  effectif_classe: number | null;
  mention: string | null;
  statut: "prepare" | "valide";
  eleve: { id: number; nom: string; prenom: string; matricule: string };
};

export default function DirecteurBulletins() {
  const queryClient = useQueryClient();
  const [classeId, setClasseId] = useState("");
  const [periodeId, setPeriodeId] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data: classes } = useQuery<Classe[]>({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data,
  });

  const { data: periodes } = useQuery<Periode[]>({
    queryKey: ["periodes"],
    queryFn: async () => (await api.get("/periodes")).data,
  });

  const { data: bulletins } = useQuery<Bulletin[]>({
    queryKey: ["bulletins", classeId, periodeId],
    queryFn: async () => (await api.get(`/classes/${classeId}/bulletins?periode_id=${periodeId}`)).data,
    enabled: !!classeId && !!periodeId,
  });

  const enAttente = bulletins?.filter((b) => b.statut === "prepare").length ?? 0;

  const validerBulletins = useMutation({
    mutationFn: async () => api.post(`/classes/${classeId}/bulletins/valider`, { periode_id: Number(periodeId) }),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["bulletins", classeId, periodeId] });
      setErreur(null);
      setMessage(`${data.nombre} bulletin(s) validé(s) — téléchargeables par le secrétariat.`);
    },
    onError: () => {
      setMessage(null);
      setErreur("Impossible de valider ces bulletins.");
    },
  });

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Bulletins</h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Classe</label>
            <select value={classeId} onChange={(e) => setClasseId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Sélectionner...</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.nom} ({c.niveau.nom})</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Période</label>
            <select value={periodeId} onChange={(e) => setPeriodeId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Sélectionner...</option>
              {periodes?.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>

          {classeId && periodeId && bulletins && bulletins.length > 0 && (
            <button
              onClick={() => {
                setMessage(null);
                validerBulletins.mutate();
              }}
              disabled={enAttente === 0 || validerBulletins.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
            >
              <CheckCircle2 size={15} />
              {validerBulletins.isPending
                ? "Validation..."
                : enAttente === 0
                ? "Tous validés"
                : `Valider ${enAttente} bulletin(s)`}
            </button>
          )}
        </div>

        {erreur && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>}
        {message && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      </div>

      {classeId && periodeId && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
            Bulletins de la classe
          </div>

          {bulletins?.length === 0 && (
            <div className="px-5 py-4 text-sm text-slate-400">
              Aucun bulletin préparé pour l'instant par le secrétariat pour cette classe/période.
            </div>
          )}

          {bulletins?.map((b, idx) => (
            <div
              key={b.id}
              className={`flex items-center justify-between px-5 py-3 text-sm ${
                bulletins.length && idx < bulletins.length - 1 ? "border-b border-slate-100" : ""
              }`}
            >
              <span className="w-52 shrink-0 font-medium text-slate-800">{b.eleve.prenom} {b.eleve.nom}</span>
              <span className="text-slate-600">{b.moyenne_generale ?? "—"} / 20</span>
              <span className="text-slate-500">{b.rang ? `${b.rang}e / ${b.effectif_classe}` : "—"}</span>
              <span className="text-slate-500">{b.mention ?? "—"}</span>
              <span className={b.statut === "valide" ? "text-emerald-600" : "text-amber-600"}>
                {b.statut === "valide" ? "Validé" : "En attente"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}