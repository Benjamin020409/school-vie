import { Users, ShieldCheck, Database, Settings, Plus } from "lucide-react";
import type { NavLien } from "../../layouts/AppLayout";


export const liensAdmin: NavLien[] = [
  { to: "/admin", label: "Utilisateurs", icon: Users },
  { to: "/admin/roles", label: "Rôles", icon: ShieldCheck },
  { to: "/admin/sauvegardes", label: "Sauvegardes", icon: Database },
  { to: "/admin/parametres", label: "Paramètres", icon: Settings },
];

const kpis = [
  { label: "Comptes actifs", valeur: "312" },
  { label: "Stockage", valeur: "4.2 Go" },
  { label: "Dernière sauvegarde", valeur: "Aujourd'hui 02h00" },
  { label: "Statut serveur", valeur: "En ligne", couleur: "text-emerald-600" },
];

const utilisateurs = [
  { nom: "Awa Koffi", role: "Secrétaire", statut: "Actif" },
  { nom: "Komla Adje", role: "Enseignant", statut: "Actif" },
  { nom: "Nadia Sossou", role: "Surveillant", statut: "Invité" },
];

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">
        Utilisateurs
      </h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="text-sm text-slate-500">{k.label}</div>
            <div className={`mt-1 text-xl font-semibold ${k.couleur ?? "text-ink"}`}>
              {k.valeur}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <span className="text-sm font-medium text-ink">
            Utilisateurs récents
          </span>
          <button className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink-light">
            <Plus size={14} strokeWidth={2} />
            Ajouter
          </button>
        </div>

        {utilisateurs.map((u, i) => (
          <div
            key={u.nom}
            className={`flex items-center justify-between px-5 py-3 text-sm ${
              i < utilisateurs.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <span className="font-medium text-slate-800">{u.nom}</span>
            <span className="text-slate-500">{u.role}</span>
            <span
              className={
                u.statut === "Actif" ? "text-emerald-600" : "text-slate-400"
              }
            >
              {u.statut}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}