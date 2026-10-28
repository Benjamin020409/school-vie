import { LayoutDashboard, School, Users, UserCog, Wallet, CalendarClock, Award, Megaphone } from "lucide-react";
import type { NavLien } from "../../layouts/AppLayout";

export const liensDirecteur: NavLien[] = [
  { to: "/directeur", label: "Vue d'ensemble", icon: LayoutDashboard },
  { to: "/directeur/classes", label: "Classes", icon: School },
  { to: "/directeur/enseignants", label: "Enseignants", icon: Users },
  { to: "/directeur/utilisateurs", label: "Autres utilisateurs", icon: UserCog },
  { to: "/directeur/finances", label: "Finances", icon: Wallet },
  { to: "/directeur/emploi-du-temps", label: "Emploi du temps", icon: CalendarClock },
  { to: "/directeur/bulletins", label: "Bulletins", icon: Award },
  { to: "/directeur/annonces", label: "Annonces", icon: Megaphone },
];

const kpis = [
  { label: "Effectif total", valeur: "1 284" },
  { label: "Présence du jour", valeur: "96 %" },
  { label: "Recettes du mois", valeur: "8,4 M" },
  { label: "Impayés", valeur: "62", couleur: "text-red-600" },
];

export default function DirecteurDashboard() {
  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">
        Vue d'ensemble
      </h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">{k.label}</div>
            <div className={`mt-1 text-xl font-semibold ${k.couleur ?? "text-ink"}`}>
              {k.valeur}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          À valider
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-sm">
          <span className="text-slate-700">Bulletins trimestre 2 — 6ème A</span>
          <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50">
            Examiner
          </button>
        </div>
        <div className="flex items-center justify-between px-5 py-3 text-sm">
          <span className="text-slate-700">3 incidents disciplinaires en attente</span>
          <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50">
            Examiner
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Annonces récentes
        </div>
        <div className="px-5 py-3 text-sm text-slate-500">
          Réunion des professeurs principaux — vendredi 10h
        </div>
      </div>
    </div>
  );
}