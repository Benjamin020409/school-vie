import { Home, GraduationCap, Calendar } from "lucide-react";
import type { NavLien } from "../../layouts/AppLayout";

export const liensEleve: NavLien[] = [
  { to: "/eleve", label: "Accueil", icon: Home },
  { to: "/eleve/notes", label: "Mes notes", icon: GraduationCap },
  { to: "/eleve/emploi-du-temps", label: "Emploi du temps", icon: Calendar },
];

const kpis = [
  { label: "Moyenne générale", valeur: "14,2" },
  { label: "Absences (trim.)", valeur: "2" },
  { label: "Prochain cours", valeur: "SVT — 11h00" },
];

const notes = [
  { matiere: "Mathématiques — Devoir 2", valeur: "15 / 20" },
  { matiere: "Histoire — Interrogation", valeur: "11 / 20" },
];

export default function EleveDashboard() {
  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">
        Mon espace
      </h1>

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
          Notes récentes
        </div>
        {notes.map((n, idx) => (
          <div
            key={n.matiere}
            className={`flex items-center justify-between px-5 py-3 text-sm ${
              idx < notes.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <span className="text-slate-800">{n.matiere}</span>
            <span className="font-medium text-ink">{n.valeur}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Annonces
        </div>
        <div className="px-5 py-3 text-sm text-slate-500">
          Sortie pédagogique reportée au 24 juillet
        </div>
      </div>
    </div>
  );
}