import { useQuery } from "@tanstack/react-query";
import { Calendar, ClipboardCheck, PenLine, Users, FileDown } from "lucide-react";
import type { NavLien } from "../../layouts/AppLayout";
import { api } from "../../lib/api";

export const liensEnseignant: NavLien[] = [
  { to: "/enseignant", label: "Mon emploi du temps", icon: Calendar },
  { to: "/enseignant/classes", label: "Liste de classe", icon: Users },
  { to: "/enseignant/presences", label: "Présences", icon: ClipboardCheck },
  { to: "/enseignant/notes", label: "Notes", icon: PenLine },
];

type MesClasses = { id: number; nom: string; niveau: string; matieres: string[] };
type Seance = {
  id: number;
  jour: string;
  heure: number;
  classe: { id: number; nom: string; niveau: { nom: string } };
  matiere: { id: number; nom: string };
};

const JOURS_ORDRE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];
const JOUR_ACTUEL = JOURS_ORDRE[new Date().getDay() - 1] ?? null; // getDay(): 0=dimanche

async function telechargerMonEmploiDuTemps() {
  const response = await api.get("/mon-espace/mon-emploi-du-temps-pdf", { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = "mon-emploi-du-temps.pdf";
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(url);
}

export default function EnseignantDashboard() {
  const { data: mesClasses, isLoading, isError } = useQuery<MesClasses[]>({
    queryKey: ["mes-classes"],
    queryFn: async () => (await api.get("/mon-espace/mes-classes")).data,
  });

  const { data: seances } = useQuery<Seance[]>({
    queryKey: ["mon-emploi-du-temps"],
    queryFn: async () => (await api.get("/mon-espace/mon-emploi-du-temps")).data,
  });

  const seancesAujourdhui = (seances ?? [])
    .filter((s) => s.jour === JOUR_ACTUEL)
    .sort((a, b) => a.heure - b.heure);

  const kpis = [
    { label: "Mes classes", valeur: isLoading ? "…" : (mesClasses?.length ?? 0) },
    { label: "Cours aujourd'hui", valeur: seances ? seancesAujourdhui.length : "…" },
    { label: "Cours cette semaine", valeur: seances?.length ?? "…" },
  ];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Mon emploi du temps</h1>
        <button
          onClick={telechargerMonEmploiDuTemps}
          className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink-light"
        >
          <FileDown size={13} />
          Télécharger la semaine (PDF)
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">{k.label}</div>
            <div className="mt-1 text-xl font-semibold text-ink">{k.valeur}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Mes classes
        </div>

        {isError && (
          <div className="px-5 py-4 text-sm text-red-600">
            Impossible de charger tes classes — vérifie qu'un profil enseignant est bien lié à ton compte.
          </div>
        )}
        {!isError && mesClasses?.length === 0 && (
          <div className="px-5 py-4 text-sm text-slate-400">
            Aucune classe pour l'instant — la direction doit d'abord t'affecter à un niveau et une matière.
          </div>
        )}
        {mesClasses?.map((c, idx) => (
          <div
            key={c.id}
            className={`flex items-center justify-between px-5 py-3 text-sm ${
              mesClasses.length && idx < mesClasses.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <span className="font-medium text-slate-800">{c.nom}</span>
            <span className="text-slate-500">{c.niveau}</span>
            <span className="text-slate-500">{c.matieres.join(", ")}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Aujourd'hui
        </div>

        {!JOUR_ACTUEL && (
          <div className="px-5 py-4 text-sm text-slate-400">Pas de cours le week-end.</div>
        )}
        {JOUR_ACTUEL && seances && seancesAujourdhui.length === 0 && (
          <div className="px-5 py-4 text-sm text-slate-400">Aucun cours prévu aujourd'hui.</div>
        )}
        {seancesAujourdhui.map((s, idx) => (
          <div
            key={s.id}
            className={`flex items-center justify-between px-5 py-3 text-sm ${
              idx < seancesAujourdhui.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <span className="text-slate-800">
              Heure {s.heure} — {s.matiere.nom} — {s.classe.nom}
            </span>
            <span className="text-slate-400">{s.classe.niveau.nom}</span>
          </div>
        ))}
      </div>
    </div>
  );
}