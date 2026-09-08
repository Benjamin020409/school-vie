import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

type Niveau = {
  id: number;
  nom: string;
  frais_scolarite: { id: number; montant: number }[];
};

export default function DirecteurFinances() {
  const queryClient = useQueryClient();
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [montants, setMontants] = useState<Record<number, string>>({});

  const { data: niveaux } = useQuery<Niveau[]>({
    queryKey: ["frais-scolarite"],
    queryFn: async () => (await api.get("/frais-scolarite")).data,
  });

  const definirFrais = useMutation({
    mutationFn: async ({ niveauId, montant }: { niveauId: number; montant: number }) =>
      api.post(`/niveaux/${niveauId}/frais-scolarite`, { montant }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frais-scolarite"] });
      setErreur(null);
      setMessage("Frais de scolarité mis à jour.");
    },
    onError: () => {
      setMessage(null);
      setErreur("Impossible d'enregistrer ce montant (vérifie qu'une année scolaire est active).");
    },
  });

  function valeurActuelle(niveau: Niveau) {
    return montants[niveau.id] ?? String(niveau.frais_scolarite?.[0]?.montant ?? "");
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Finances</h1>

      {erreur && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>}
      {message && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Frais de scolarité par niveau (année scolaire active)
        </div>

        {niveaux?.length === 0 && (
          <div className="px-5 py-4 text-sm text-slate-400">Aucun niveau créé pour l'instant.</div>
        )}

        {niveaux?.map((n, idx) => (
          <div
            key={n.id}
            className={`flex items-center justify-between px-5 py-3 text-sm ${
              niveaux.length && idx < niveaux.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <span className="w-40 shrink-0 font-medium text-slate-800">{n.nom}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={valeurActuelle(n)}
                onChange={(e) => setMontants((prev) => ({ ...prev, [n.id]: e.target.value }))}
                placeholder="Montant (FCFA)"
                className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <span className="text-slate-400">FCFA</span>
            </div>
            <button
              onClick={() => {
                setMessage(null);
                definirFrais.mutate({ niveauId: n.id, montant: Number(valeurActuelle(n) || 0) });
              }}
              disabled={definirFrais.isPending || !valeurActuelle(n)}
              className="rounded-lg bg-ink px-4 py-2 text-xs font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
            >
              Enregistrer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}