import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Banknote, AlertCircle, Users, BarChart3 } from "lucide-react";
import type { NavLien } from "../../layouts/AppLayout";
import { api } from "../../lib/api";

export const liensComptable: NavLien[] = [
  { to: "/comptable", label: "Vue d'ensemble", icon: LayoutDashboard },
  { to: "/comptable/paiements", label: "Paiements", icon: Banknote },
  { to: "/comptable/impayes", label: "Impayés", icon: AlertCircle },
  { to: "/comptable/paie", label: "Paie enseignants", icon: Users },
  { to: "/comptable/rapports", label: "Rapports", icon: BarChart3 },
];

type VueEnsemble = {
  encaisse_aujourdhui: number;
  impayes_totaux: number;
  eleves_avec_solde: number;
  retards: { eleve_id: number; nom: string; prenom: string; classe: string; montant_restant: number }[];
};

function formaterMontant(montant: number) {
  return new Intl.NumberFormat("fr-FR").format(montant) + " FCFA";
}

export default function ComptableDashboard() {
  const { data, isLoading } = useQuery<VueEnsemble>({
    queryKey: ["comptable-vue-ensemble"],
    queryFn: async () => (await api.get("/comptable/vue-ensemble")).data,
  });

  const kpis = [
    { label: "Encaissé aujourd'hui", valeur: isLoading ? "…" : formaterMontant(data?.encaisse_aujourdhui ?? 0) },
    { label: "Impayés totaux", valeur: isLoading ? "…" : formaterMontant(data?.impayes_totaux ?? 0), couleur: "text-red-600" },
    { label: "Élèves avec solde restant", valeur: isLoading ? "…" : (data?.eleves_avec_solde ?? 0), couleur: "text-amber-600" },
  ];

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">
        Vue d'ensemble
      </h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">{k.label}</div>
            <div className={`mt-1 text-xl font-semibold ${k.couleur ?? "text-ink"}`}>
              {k.valeur}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Plus gros impayés
        </div>

        {data?.retards.length === 0 && (
          <div className="px-5 py-4 text-sm text-slate-400">Aucun impayé — tous les élèves sont à jour.</div>
        )}

        {data?.retards.map((r, idx) => (
          <div
            key={r.eleve_id}
            className={`flex items-center justify-between px-5 py-3 text-sm ${
              data.retards.length && idx < data.retards.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <span className="text-slate-800">{r.prenom} {r.nom}</span>
            <span className="text-slate-500">{r.classe}</span>
            <span className="font-medium text-red-600">{formaterMontant(r.montant_restant)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}