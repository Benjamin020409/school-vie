import { useState } from "react";
import { Users, Banknote, Mail } from "lucide-react";
import type { NavLien } from "../../layouts/AppLayout";

export const liensTuteur: NavLien[] = [
  { to: "/tuteur", label: "Mes enfants", icon: Users },
  { to: "/tuteur/paiements", label: "Paiements", icon: Banknote },
  { to: "/tuteur/messages", label: "Messages", icon: Mail },
];

const enfants = ["Edem — 5ème B", "Fafa — 6ème A"];

export default function TuteurDashboard() {
  const [enfantActif, setEnfantActif] = useState(0);

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">
        Mes enfants
      </h1>

      <div className="mb-6 flex gap-2">
        {enfants.map((e, idx) => (
          <button
            key={e}
            onClick={() => setEnfantActif(idx)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              idx === enfantActif
                ? "bg-ink text-white"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Moyenne</div>
          <div className="mt-1 text-xl font-semibold text-ink">13,8</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Absences</div>
          <div className="mt-1 text-xl font-semibold text-ink">1</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Solde dû</div>
          <div className="mt-1 text-xl font-semibold text-red-600">45 000</div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <span className="text-sm font-medium text-ink">Échéance de scolarité</span>
          <button className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink-light">
            Payer
          </button>
        </div>
        <div className="flex items-center justify-between px-5 py-3 text-sm">
          <span className="text-slate-800">2ème tranche — échéance 31 juillet</span>
          <span className="text-red-600">En retard</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Message récent
        </div>
        <div className="px-5 py-3 text-sm text-slate-500">
          Le professeur principal souhaite un rendez-vous cette semaine
        </div>
      </div>
    </div>
  );
}