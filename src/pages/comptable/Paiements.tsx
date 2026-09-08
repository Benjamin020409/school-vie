import React,  { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileDown, Plus, X } from "lucide-react";
import { api } from "../../lib/api";

type Niveau = { id: number; nom: string; frais_scolarite: { id: number; montant: number }[] };
type Classe = { id: number; nom: string; niveau: { id: number; nom: string } };
type LigneEleve = {
  eleve_id: number;
  nom: string;
  prenom: string;
  matricule: string;
  montant_scolarite: number;
  montant_restant: number;
  mode_paiement: "bloc" | "tranche" | null;
  type_tranche: "mensuel" | "trimestriel" | "semestriel" | null;
  delai_paiement: string | null;
  dernier_paiement_montant: number | null;
  dernier_paiement_date: string | null;
  dernier_paiement_id: number | null;
};

function formaterMontant(montant: number | null) {
  if (montant === null) return "—";
  return new Intl.NumberFormat("fr-FR").format(montant) + " FCFA";
}

async function telechargerRecu(paiementId: number, matricule: string) {
  const response = await api.get(`/paiements/${paiementId}/recu`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `recu-${matricule}.pdf`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(url);
}

export default function ComptablePaiements() {
  const queryClient = useQueryClient();
  const [niveauId, setNiveauId] = useState("");
  const [classeId, setClasseId] = useState("");
  const [eleveOuvertId, setEleveOuvertId] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [telechargementId, setTelechargementId] = useState<number | null>(null);

  const { data: niveaux } = useQuery<Niveau[]>({
    queryKey: ["frais-scolarite"],
    queryFn: async () => (await api.get("/frais-scolarite")).data,
  });

  const { data: classes } = useQuery<Classe[]>({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data,
  });

  const { data: lignes } = useQuery<LigneEleve[]>({
    queryKey: ["tableau-paiements", classeId],
    queryFn: async () => (await api.get(`/classes/${classeId}/tableau-paiements`)).data,
    enabled: !!classeId,
  });

  const niveauChoisi = niveaux?.find((n) => n.id === Number(niveauId));
  const fraisNiveau = niveauChoisi?.frais_scolarite?.[0]?.montant ?? null;
  const classesDuNiveau = classes?.filter((c) => c.niveau.id === Number(niveauId)) ?? [];

  const enregistrerPaiement = useMutation({
    mutationFn: async (payload: { eleve_id: number; mode_paiement: string; type_tranche: string; montant: string }) =>
      api.post("/paiements", {
        eleve_id: payload.eleve_id,
        mode_paiement: payload.mode_paiement,
        type_tranche: payload.mode_paiement === "tranche" ? payload.type_tranche : undefined,
        montant: Number(payload.montant),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tableau-paiements", classeId] });
      setErreur(null);
      setEleveOuvertId(null);
    },
    onError: (error: unknown) => {
      const reponse = (error as { response?: { data?: { message?: string } } })?.response?.data;
      setErreur(reponse?.message ?? "Impossible d'enregistrer ce paiement.");
    },
  });

  function handleSubmitPaiement(e: React.FormEvent<HTMLFormElement>, eleveId: number) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    enregistrerPaiement.mutate({
      eleve_id: eleveId,
      mode_paiement: String(f.get("mode_paiement")),
      type_tranche: String(f.get("type_tranche") ?? ""),
      montant: String(f.get("montant")),
    });
  }

  async function handleTelecharger(l: LigneEleve) {
    if (!l.dernier_paiement_id) return;
    setTelechargementId(l.dernier_paiement_id);
    try {
      await telechargerRecu(l.dernier_paiement_id, l.matricule);
    } catch {
      setErreur("Impossible de télécharger ce reçu pour le moment.");
    } finally {
      setTelechargementId(null);
    }
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Paiements</h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Niveau</label>
            <select
              value={niveauId}
              onChange={(e) => {
                setNiveauId(e.target.value);
                setClasseId("");
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Sélectionner...</option>
              {niveaux?.map((n) => <option key={n.id} value={n.id}>{n.nom}</option>)}
            </select>
          </div>

          {niveauId && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Frais de scolarité du niveau</label>
              <input
                readOnly
                value={fraisNiveau !== null ? formaterMontant(fraisNiveau) : "Non défini"}
                className="w-48 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
              />
            </div>
          )}

          {niveauId && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Classe</label>
              <select
                value={classeId}
                onChange={(e) => {
                  setClasseId(e.target.value);
                  setEleveOuvertId(null);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Sélectionner...</option>
                {classesDuNiveau.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
          )}
        </div>

        {niveauId && fraisNiveau === null && (
          <p className="mt-3 text-sm text-amber-600">
            Aucun frais de scolarité défini pour ce niveau — la direction doit d'abord le renseigner.
          </p>
        )}
      </div>

      {erreur && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>}

      {classeId && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
            Suivi des paiements
          </div>

          {lignes?.length === 0 && (
            <div className="px-5 py-4 text-sm text-slate-400">Aucun élève inscrit dans cette classe.</div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">Élève</th>
                <th className="px-4 py-2 text-right font-medium">Scolarité</th>
                <th className="px-4 py-2 text-right font-medium">Restant</th>
                <th className="px-4 py-2 font-medium">Mode</th>
                <th className="px-4 py-2 font-medium">Échéance</th>
                <th className="px-4 py-2 text-right font-medium">Dernier versement</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lignes?.map((l) => (
                 <React.Fragment key={l.eleve_id}>
                  <tr  className="border-b border-slate-50">
                    <td className="px-4 py-2.5 text-slate-800">{l.prenom} {l.nom}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formaterMontant(l.montant_scolarite)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${l.montant_restant > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formaterMontant(l.montant_restant)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {l.mode_paiement === "bloc" ? "En bloc" : l.mode_paiement === "tranche" ? `Tranche (${l.type_tranche})` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{l.delai_paiement ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formaterMontant(l.dernier_paiement_montant)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{l.dernier_paiement_date ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEleveOuvertId(eleveOuvertId === l.eleve_id ? null : l.eleve_id)}
                          disabled={l.montant_restant <= 0}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {eleveOuvertId === l.eleve_id ? <X size={12} /> : <Plus size={12} />}
                          Paiement
                        </button>
                        <button
                          onClick={() => handleTelecharger(l)}
                          disabled={!l.dernier_paiement_id || telechargementId === l.dernier_paiement_id}
                          className="flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-ink-light disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <FileDown size={12} />
                          Reçu
                        </button>
                      </div>
                    </td>
                  </tr>

                  {eleveOuvertId === l.eleve_id && (
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <td colSpan={8} className="px-4 py-4">
                        <form
                          onSubmit={(e) => handleSubmitPaiement(e, l.eleve_id)}
                          className="flex flex-wrap items-end gap-3"
                        >
                          <div>
                            <label className="mb-1 block text-xs text-slate-600">Mode de paiement</label>
                            <select name="mode_paiement" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" id={`mode-${l.eleve_id}`}>
                              <option value="">Choisir...</option>
                              <option value="bloc">En bloc</option>
                              <option value="tranche">Par tranche</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-600">Type de tranche</label>
                            <select name="type_tranche" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                              <option value="">—</option>
                              <option value="mensuel">Par mois</option>
                              <option value="trimestriel">Par trimestre</option>
                              <option value="semestriel">Par semestre</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-600">
                              Montant (solde : {formaterMontant(l.montant_restant)})
                            </label>
                            <input
                              name="montant"
                              type="number"
                              min="1"
                              required
                              defaultValue={l.montant_restant}
                              className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={enregistrerPaiement.isPending}
                            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
                          >
                            {enregistrerPaiement.isPending ? "Enregistrement..." : "Enregistrer le paiement"}
                          </button>
                        </form>
                        <p className="mt-2 text-xs text-slate-400">
                          En cas de paiement "En bloc", le montant doit être exactement égal au solde restant.
                        </p>
                      </td>
                    </tr>
                  )}
                 </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}