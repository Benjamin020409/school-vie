import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileDown, ListChecks, Paperclip, Plus, UserX, X } from "lucide-react";
import { api } from "@/lib/api";

type Niveau = { id: number; nom: string; frais_scolarite: { id: number; montant: number }[] };
type Classe = { id: number; nom: string; niveau: { id: number; nom: string } };
type Tranche = { numero: number; nom: string; montant: number; debut: string; echeance: string; echue: boolean };
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
  dernier_paiement_moyen: "especes" | "banque" | null;
  dernier_paiement_justificatif: boolean;
};

function formaterMontant(montant: number | null) {
  if (montant === null) return "—";
  return new Intl.NumberFormat("fr-FR").format(montant) + " FCFA";
}

function telechargerBlob(data: Blob, nomFichier: string) {
  const url = window.URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(url);
}

function messageErreur(error: unknown, defaut: string) {
  const reponse = (error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data;
  return (reponse?.errors ? Object.values(reponse.errors)[0]?.[0] : reponse?.message) ?? defaut;
}

// Quand on télécharge un PDF, l'erreur du serveur arrive sous forme de blob : on la relit
async function messageDepuisBlob(error: unknown, defaut: string) {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const json = JSON.parse(await data.text());
      return json.errors ? (Object.values(json.errors)[0] as string[])[0] : (json.message ?? defaut);
    } catch {
      return defaut;
    }
  }
  return defaut;
}

export default function ComptablePaiements() {
  const queryClient = useQueryClient();
  const [niveauId, setNiveauId] = useState("");
  const [classeId, setClasseId] = useState("");
  const [eleveOuvertId, setEleveOuvertId] = useState<number | null>(null);
  const [modeChoisi, setModeChoisi] = useState("");
  const [moyenChoisi, setMoyenChoisi] = useState("especes");
  const [fichier, setFichier] = useState<File | null>(null);
  const [trancheChoisie, setTrancheChoisie] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [telechargementId, setTelechargementId] = useState<number | null>(null);
  const [listeEnCours, setListeEnCours] = useState<string | null>(null);

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

  const { data: tranches, isError: erreurTranches } = useQuery<Tranche[]>({
    queryKey: ["tranches-classe", classeId],
    queryFn: async () => (await api.get(`/classes/${classeId}/tranches`)).data,
    enabled: !!classeId,
    retry: false,
  });

  const niveauChoisi = niveaux?.find((n) => n.id === Number(niveauId));
  const fraisNiveau = niveauChoisi?.frais_scolarite?.[0]?.montant ?? null;
  const classesDuNiveau = classes?.filter((c) => c.niveau.id === Number(niveauId)) ?? [];
  const classeChoisie = classesDuNiveau.find((c) => c.id === Number(classeId));

  function reinitialiserFormulaire() {
    setModeChoisi("");
    setMoyenChoisi("especes");
    setFichier(null);
  }

  function basculerFormulaire(eleveId: number) {
    reinitialiserFormulaire();
    setErreur(null);
    setEleveOuvertId(eleveOuvertId === eleveId ? null : eleveId);
  }

  const enregistrerPaiement = useMutation({
    mutationFn: async (p: {
      eleve_id: number;
      mode_paiement: string;
      type_tranche: string;
      moyen_paiement: string;
      montant: string;
      justificatif: File | null;
    }) => {
      const formData = new FormData();
      formData.append("eleve_id", String(p.eleve_id));
      formData.append("mode_paiement", p.mode_paiement);
      if (p.mode_paiement === "tranche") formData.append("type_tranche", p.type_tranche);
      formData.append("moyen_paiement", p.moyen_paiement);
      formData.append("montant", p.montant);
      if (p.moyen_paiement === "banque" && p.justificatif) formData.append("justificatif", p.justificatif);

      return api.post("/paiements", formData, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tableau-paiements", classeId] });
      queryClient.invalidateQueries({ queryKey: ["comptable-vue-ensemble"] });
      setErreur(null);
      setEleveOuvertId(null);
      reinitialiserFormulaire();
    },
    onError: (error: unknown) => setErreur(messageErreur(error, "Impossible d'enregistrer ce paiement.")),
  });

  function handleSubmitPaiement(e: React.FormEvent<HTMLFormElement>, eleveId: number) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    enregistrerPaiement.mutate({
      eleve_id: eleveId,
      mode_paiement: modeChoisi,
      type_tranche: String(f.get("type_tranche") ?? ""),
      moyen_paiement: moyenChoisi,
      montant: String(f.get("montant")),
      justificatif: fichier,
    });
  }

  async function handleTelechargerRecu(l: LigneEleve) {
    if (!l.dernier_paiement_id) return;
    setTelechargementId(l.dernier_paiement_id);
    try {
      const response = await api.get(`/paiements/${l.dernier_paiement_id}/recu`, { responseType: "blob" });
      telechargerBlob(response.data, `recu-${l.matricule}.pdf`);
    } catch {
      setErreur("Impossible de télécharger ce reçu pour le moment.");
    } finally {
      setTelechargementId(null);
    }
  }

  async function handleOuvrirJustificatif(l: LigneEleve) {
    if (!l.dernier_paiement_id) return;
    // La fenêtre est ouverte tout de suite (sinon le navigateur bloque la popup), puis on y charge le fichier
    const fenetre = window.open("", "_blank");
    try {
      const response = await api.get(`/paiements/${l.dernier_paiement_id}/justificatif`, { responseType: "blob" });
      const url = window.URL.createObjectURL(response.data);
      if (fenetre) fenetre.location.href = url;
    } catch {
      fenetre?.close();
      setErreur("Impossible d'ouvrir le justificatif.");
    }
  }

  async function handleTelechargerListe(type: "liste-paiements" | "liste-renvoi") {
    if (!classeId) return;
    setErreur(null);
    setListeEnCours(type);
    try {
      const params = type === "liste-renvoi" ? { tranche: trancheChoisie } : undefined;
      const response = await api.get(`/classes/${classeId}/${type}/pdf`, { params, responseType: "blob" });
      const nom =
        type === "liste-renvoi"
          ? `liste-renvoi-${classeChoisie?.nom ?? "classe"}-tranche-${trancheChoisie}.pdf`
          : `liste-paiements-${classeChoisie?.nom ?? "classe"}.pdf`;
      telechargerBlob(response.data, nom);
    } catch (error) {
      setErreur(await messageDepuisBlob(error, "Impossible de générer cette liste pour le moment."));
    } finally {
      setListeEnCours(null);
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
                setEleveOuvertId(null);
                setTrancheChoisie("");
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
                  setTrancheChoisie("");
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

        {classeId && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-slate-600">Impression pour {classeChoisie?.nom} :</span>
              <button
                onClick={() => handleTelechargerListe("liste-paiements")}
                disabled={listeEnCours !== null}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50 disabled:opacity-60"
              >
                <ListChecks size={13} />
                {listeEnCours === "liste-paiements" ? "Génération..." : "Liste de paiement"}
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Liste de renvoi — choisir la tranche</label>
                <select
                  value={trancheChoisie}
                  onChange={(e) => setTrancheChoisie(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Choisir une tranche...</option>
                  {tranches?.map((t) => (
                    <option key={t.numero} value={t.numero}>
                      {t.nom} — {formaterMontant(t.montant)} — échéance {t.echeance}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => handleTelechargerListe("liste-renvoi")}
                disabled={!trancheChoisie || listeEnCours !== null}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserX size={13} />
                {listeEnCours === "liste-renvoi" ? "Génération..." : "Générer la liste de renvoi"}
              </button>
            </div>

            {erreurTranches && (
              <p className="text-xs text-amber-600">
                Tranches indisponibles : vérifie que les frais de scolarité de ce niveau sont définis pour l'année scolaire active.
              </p>
            )}
          </div>
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
                <Fragment key={l.eleve_id}>
                  <tr className="border-b border-slate-50">
                    <td className="px-4 py-2.5 text-slate-800">{l.prenom} {l.nom}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formaterMontant(l.montant_scolarite)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${l.montant_restant > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formaterMontant(l.montant_restant)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {l.mode_paiement === "bloc" ? "En bloc" : l.mode_paiement === "tranche" ? `Tranche (${l.type_tranche})` : "—"}
                      {l.dernier_paiement_moyen && (
                        <span className="block text-xs text-slate-400">
                          {l.dernier_paiement_moyen === "banque" ? "Banque" : "Espèces"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{l.delai_paiement ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formaterMontant(l.dernier_paiement_montant)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{l.dernier_paiement_date ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => basculerFormulaire(l.eleve_id)}
                          disabled={l.montant_restant <= 0}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {eleveOuvertId === l.eleve_id ? <X size={12} /> : <Plus size={12} />}
                          Paiement
                        </button>
                        {l.dernier_paiement_justificatif && (
                          <button
                            onClick={() => handleOuvrirJustificatif(l)}
                            title="Voir le justificatif bancaire du dernier paiement"
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50"
                          >
                            <Paperclip size={12} />
                            Justificatif
                          </button>
                        )}
                        <button
                          onClick={() => handleTelechargerRecu(l)}
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
                        <form onSubmit={(e) => handleSubmitPaiement(e, l.eleve_id)} className="flex flex-wrap items-end gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-slate-600">Mode de paiement</label>
                            <select
                              value={modeChoisi}
                              onChange={(e) => setModeChoisi(e.target.value)}
                              required
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              <option value="">Choisir...</option>
                              <option value="bloc">En bloc</option>
                              <option value="tranche">Par tranche</option>
                            </select>
                          </div>

                          {modeChoisi === "tranche" && (
                            <div>
                              <label className="mb-1 block text-xs text-slate-600">Type de tranche</label>
                              <select name="type_tranche" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                                <option value="">Choisir...</option>
                                <option value="mensuel">Par mois</option>
                                <option value="trimestriel">Par trimestre</option>
                                <option value="semestriel">Par semestre</option>
                              </select>
                            </div>
                          )}

                          <div>
                            <label className="mb-1 block text-xs text-slate-600">Moyen de paiement</label>
                            <select
                              value={moyenChoisi}
                              onChange={(e) => {
                                setMoyenChoisi(e.target.value);
                                if (e.target.value !== "banque") setFichier(null);
                              }}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              <option value="especes">Espèces</option>
                              <option value="banque">Banque</option>
                            </select>
                          </div>

                          {moyenChoisi === "banque" && (
                            <div>
                              <label className="mb-1 block text-xs text-slate-600">Photo du reçu bancaire</label>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                required
                                onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
                                className="block w-64 text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-xs file:font-medium"
                              />
                            </div>
                          )}

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
                          En cas de paiement « En bloc », le montant doit être exactement égal au solde restant. Pour un paiement par banque, le justificatif (image ou PDF, 4 Mo maximum) est obligatoire.
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}