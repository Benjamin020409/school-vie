import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserX, Clock, AlertTriangle, School, MessageCircle, Mail } from "lucide-react";
import type { NavLien } from "@/layouts/AppLayout";
import { api } from "@/lib/api";

export const liensSurveillant: NavLien[] = [
  { to: "/surveillant", label: "Absences", icon: UserX },
  { to: "/surveillant/retards", label: "Retards", icon: Clock },
  { to: "/surveillant/incidents", label: "Incidents", icon: AlertTriangle },
  { to: "/surveillant/classe", label: "Classe", icon: School },
];

type Classe = { id: number; nom: string; niveau: { id: number; nom: string } };
type EleveJour = {
  eleve_id: number;
  nom: string;
  prenom: string;
  matricule: string;
  statut: "present" | "absent" | "retard";
  motif: string | null;
  justifie: boolean;
  presence_id: number | null;
};
type PresenceJour = {
  id: number;
  statut: "absent" | "retard";
  motif: string | null;
  justifie: boolean;
  eleve: { id: number; nom: string; prenom: string; matricule: string };
  classe: { id: number; nom: string };
};

export default function SurveillantDashboard() {
  const queryClient = useQueryClient();
  const [classeId, setClasseId] = useState("");
  const [eleveOuvertId, setEleveOuvertId] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ email: boolean; whatsapp: boolean; tel: boolean } | null>(null);

  const { data: classes } = useQuery<Classe[]>({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data,
  });

  const { data: elevesJour } = useQuery<EleveJour[]>({
    queryKey: ["eleves-presence", classeId],
    queryFn: async () => (await api.get(`/classes/${classeId}/eleves-presence`)).data,
    enabled: !!classeId,
  });

  const { data: presencesJour } = useQuery<PresenceJour[]>({
    queryKey: ["presences-aujourdhui"],
    queryFn: async () => (await api.get("/presences/aujourdhui")).data,
  });

  const absentsAujourdhui = presencesJour?.filter((p) => p.statut === "absent").length ?? 0;
  const retardsAujourdhui = presencesJour?.filter((p) => p.statut === "retard").length ?? 0;

  const enregistrerPresence = useMutation({
    mutationFn: async (payload: { eleve_id: number; classe_id: number; statut: string; motif: string }) =>
      api.post("/presences", {
        eleve_id: payload.eleve_id,
        classe_id: payload.classe_id,
        statut: payload.statut,
        motif: payload.motif || undefined,
      }),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["eleves-presence", classeId] });
      queryClient.invalidateQueries({ queryKey: ["presences-aujourdhui"] });
      setErreur(null);
      setEleveOuvertId(null);
      setNotification({
        email: data.email_envoye,
        whatsapp: !!data.whatsapp_lien,
        tel: !!data.tuteur_telephone,
      });
      if (data.whatsapp_lien) {
        window.open(data.whatsapp_lien, "_blank");
      }
    },
    onError: () => setErreur("Impossible d'enregistrer cette présence."),
  });

  const justifier = useMutation({
    mutationFn: async (presenceId: number) => api.put(`/presences/${presenceId}/justifier`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presences-aujourdhui"] });
      queryClient.invalidateQueries({ queryKey: ["eleves-presence", classeId] });
    },
  });

  const annulerPresence = useMutation({
    mutationFn: async (presenceId: number) => api.delete(`/presences/${presenceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presences-aujourdhui"] });
      queryClient.invalidateQueries({ queryKey: ["eleves-presence", classeId] });
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>, eleveId: number) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    enregistrerPresence.mutate({
      eleve_id: eleveId,
      classe_id: Number(classeId),
      statut: String(f.get("statut")),
      motif: String(f.get("motif") ?? ""),
    });
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Absences</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Absents aujourd'hui</div>
          <div className="mt-1 text-xl font-semibold text-red-600">{absentsAujourdhui}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Retards aujourd'hui</div>
          <div className="mt-1 text-xl font-semibold text-amber-600">{retardsAujourdhui}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Incidents ouverts</div>
          <div className="mt-1 text-xl font-semibold text-ink">0</div>
        </div>
      </div>

      {erreur && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>}

      {notification && (
        <div className="mb-6 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
          <p className="mb-1 font-medium text-ink">Notification au tuteur :</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Mail size={14} className={notification.email ? "text-emerald-600" : "text-slate-300"} />
              {notification.email ? "Email envoyé" : "Email non envoyé (pas d'adresse ou échec)"}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle size={14} className={notification.whatsapp ? "text-emerald-600" : "text-slate-300"} />
              {notification.whatsapp ? "Lien WhatsApp ouvert — clique Envoyer" : "Aucun numéro de tuteur enregistré"}
            </span>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Enregistrer une présence
        </div>
        <div className="px-5 py-4">
          <select
            value={classeId}
            onChange={(e) => {
              setClasseId(e.target.value);
              setEleveOuvertId(null);
            }}
            className="mb-4 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Choisir une classe...</option>
            {classes?.map((c) => <option key={c.id} value={c.id}>{c.nom} ({c.niveau.nom})</option>)}
          </select>

          {!classeId && <p className="text-sm text-slate-400">Sélectionne une classe pour voir ses élèves.</p>}

          {classeId && elevesJour?.map((e, idx) => (
            <div key={e.eleve_id}>
              <div
                className={`flex items-center justify-between py-2.5 text-sm ${
                  eleveOuvertId !== e.eleve_id && idx < (elevesJour.length - 1) ? "border-b border-slate-100" : ""
                }`}
              >
                <span className="w-52 shrink-0 text-slate-800">{e.prenom} {e.nom}</span>
                <span
                  className={
                    e.statut === "absent" ? "text-red-600" : e.statut === "retard" ? "text-amber-600" : "text-emerald-600"
                  }
                >
                  {e.statut === "absent" ? "Absent" : e.statut === "retard" ? "Retard" : "Présent"}
                  {e.justifie && " (justifié)"}
                </span>
                <div className="flex gap-2">
                  {e.presence_id && (
                    <button
                      onClick={() => annulerPresence.mutate(e.presence_id!)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Remettre présent
                    </button>
                  )}
                  <button
                    onClick={() => setEleveOuvertId(eleveOuvertId === e.eleve_id ? null : e.eleve_id)}
                    className="rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-white hover:bg-ink-light"
                  >
                    {eleveOuvertId === e.eleve_id ? "Fermer" : "Marquer absent/retard"}
                  </button>
                </div>
              </div>

              {eleveOuvertId === e.eleve_id && (
                <form
                  onSubmit={(ev) => handleSubmit(ev, e.eleve_id)}
                  className={`flex flex-wrap items-end gap-3 bg-slate-50 px-4 py-3 ${idx < elevesJour.length - 1 ? "border-b border-slate-100" : ""}`}
                >
                  <select name="statut" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="absent">Absent</option>
                    <option value="retard">Retard</option>
                  </select>
                  <input name="motif" placeholder="Motif (optionnel)" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <button
                    type="submit"
                    disabled={enregistrerPresence.isPending}
                    className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-light disabled:opacity-60"
                  >
                    {enregistrerPresence.isPending ? "Enregistrement..." : "Enregistrer et notifier"}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Absences du jour (toutes classes)
        </div>

        {presencesJour?.length === 0 && (
          <div className="px-5 py-4 text-sm text-slate-400">Aucune absence ou retard enregistré aujourd'hui.</div>
        )}

        {presencesJour?.map((p, idx) => (
          <div
            key={p.id}
            className={`flex items-center justify-between px-5 py-3 text-sm ${
              presencesJour.length && idx < presencesJour.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <span className="text-slate-800">{p.eleve.prenom} {p.eleve.nom}</span>
            <span className="text-slate-500">{p.classe.nom}</span>
            <span className={p.statut === "absent" ? "text-red-600" : "text-amber-600"}>
              {p.statut === "absent" ? "Absent" : "Retard"}
            </span>
            {p.justifie ? (
              <span className="text-emerald-600">Justifié</span>
            ) : (
              <button
                onClick={() => justifier.mutate(p.id)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50"
              >
                Justifier
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}