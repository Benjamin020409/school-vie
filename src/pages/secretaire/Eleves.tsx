import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Pencil, Eye, FileDown, Paperclip, Trash2, Upload } from "lucide-react";
import { api } from "../../lib/api";

type Tuteur = { id: number; nom: string; telephone: string | null; email: string | null; adresse: string | null };
type Classe = { id: number; nom: string };
type AnneeScolaire = { libelle: string };
type Inscription = { classe: Classe; date_inscription: string; statut: string; anneeScolaire?: AnneeScolaire };
type Eleve = {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  lieu_naissance: string | null;
  sexe: "M" | "F" | null;
  tuteur: Tuteur | null;
  inscriptions: Inscription[];
};
type DocumentEleve = {
  id: number;
  nom_original: string;
  taille: number | null;
  created_at: string;
};

type Panneau = { id: number; mode: "consulter" | "completer" | "documents" } | null;

function formatTaille(octets: number | null) {
  if (!octets) return "";
  const ko = octets / 1024;
  if (ko < 1024) return `${ko.toFixed(0)} Ko`;
  return `${(ko / 1024).toFixed(1)} Mo`;
}

async function telechargerFiche(eleve: Eleve) {
  const response = await api.get(`/eleves/${eleve.id}/fiche-inscription`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `fiche-inscription-${eleve.matricule}.pdf`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(url);
}

async function telechargerDocument(doc: DocumentEleve) {
  const response = await api.get(`/documents/${doc.id}/telecharger`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = doc.nom_original;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(url);
}

function LigneInfo({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800">{valeur || "—"}</span>
    </div>
  );
}

export default function SecretaireEleves() {
  const queryClient = useQueryClient();
  const [recherche, setRecherche] = useState("");
  const [panneau, setPanneau] = useState<Panneau>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const inputFichierRef = useRef<HTMLInputElement>(null);

  const { data: eleves } = useQuery<Eleve[]>({
    queryKey: ["eleves-liste", recherche],
    queryFn: async () => (await api.get(`/eleves${recherche ? `?q=${encodeURIComponent(recherche)}` : ""}`)).data,
  });

  const { data: documents } = useQuery<DocumentEleve[]>({
    queryKey: ["documents", panneau?.id],
    queryFn: async () => (await api.get(`/eleves/${panneau!.id}/documents`)).data,
    enabled: panneau?.mode === "documents",
  });

  const completerDossier = useMutation({
    mutationFn: async (payload: {
      id: number;
      date_naissance: string;
      lieu_naissance: string;
      sexe: string;
      tuteur_email: string;
      tuteur_adresse: string;
    }) =>
      api.put(`/eleves/${payload.id}`, {
        date_naissance: payload.date_naissance || undefined,
        lieu_naissance: payload.lieu_naissance || undefined,
        sexe: payload.sexe || undefined,
        tuteur_email: payload.tuteur_email || undefined,
        tuteur_adresse: payload.tuteur_adresse || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eleves-liste"] });
      setPanneau(null);
    },
  });

  const uploaderDocuments = useMutation({
    mutationFn: async ({ eleveId, fichiers }: { eleveId: number; fichiers: FileList }) => {
      const formData = new FormData();
      Array.from(fichiers).forEach((f) => formData.append("fichiers[]", f));
      return api.post(`/eleves/${eleveId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", panneau?.id] });
      setErreur(null);
      if (inputFichierRef.current) inputFichierRef.current.value = "";
    },
    onError: () => setErreur("Échec de l'envoi (fichier trop lourd ou format non supporté — max 5 Mo, pdf/jpg/png/doc/docx)."),
  });

  const supprimerDocument = useMutation({
    mutationFn: async (documentId: number) => api.delete(`/documents/${documentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents", panneau?.id] }),
  });

  const selection = eleves?.find((e) => e.id === panneau?.id) ?? null;

  async function handleTelecharger(e: Eleve) {
    setErreur(null);
    try {
      await telechargerFiche(e);
    } catch {
      setErreur("Impossible de générer la fiche pour le moment.");
    }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!panneau || !e.target.files || e.target.files.length === 0) return;
    uploaderDocuments.mutate({ eleveId: panneau.id, fichiers: e.target.files });
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Élèves</h1>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
        <Search size={16} className="text-slate-400" />
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un élève..."
          className="flex-1 text-sm outline-none"
        />
      </div>

      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        {eleves?.length === 0 && (
          <div className="px-5 py-4 text-sm text-slate-400">Aucun élève trouvé.</div>
        )}

        {eleves?.map((e, idx) => {
          const dossierComplet = e.date_naissance && e.lieu_naissance && e.sexe;
          const classe = e.inscriptions?.[0]?.classe?.nom ?? "Non inscrit";
          const estOuvert = panneau?.id === e.id;

          return (
            <div key={e.id}>
              <div
                className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm ${
                  idx < eleves.length - 1 && !estOuvert ? "border-b border-slate-100" : ""
                }`}
              >
                <div className="min-w-[180px]">
                  <span className="font-medium text-slate-800">{e.prenom} {e.nom}</span>
                  <span className="ml-2 text-slate-400">{e.matricule}</span>
                </div>
                <span className="flex-1 text-slate-500">{classe}</span>
                <span className={dossierComplet ? "text-emerald-600" : "text-amber-600"}>
                  {dossierComplet ? "Dossier complet" : "À compléter"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPanneau(estOuvert && panneau?.mode === "consulter" ? null : { id: e.id, mode: "consulter" })}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50"
                  >
                    <Eye size={13} />
                    Consulter
                  </button>
                  <button
                    onClick={() => setPanneau(estOuvert && panneau?.mode === "completer" ? null : { id: e.id, mode: "completer" })}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50"
                  >
                    <Pencil size={13} />
                    Compléter
                  </button>
                  <button
                    onClick={() => setPanneau(estOuvert && panneau?.mode === "documents" ? null : { id: e.id, mode: "documents" })}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-slate-50"
                  >
                    <Paperclip size={13} />
                    Documents
                  </button>
                  <button
                    onClick={() => handleTelecharger(e)}
                    className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink-light"
                  >
                    <FileDown size={13} />
                    Fiche d'inscription
                  </button>
                </div>
              </div>

              {estOuvert && panneau?.mode === "consulter" && selection && (
                <div className={`bg-slate-50 px-5 py-4 ${idx < eleves.length - 1 ? "border-b border-slate-100" : ""}`}>
                  <div className="grid grid-cols-2 gap-x-8">
                    <div>
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Élève</div>
                      <LigneInfo label="Matricule" valeur={selection.matricule} />
                      <LigneInfo label="Nom" valeur={selection.nom} />
                      <LigneInfo label="Prénom" valeur={selection.prenom} />
                      <LigneInfo label="Date de naissance" valeur={selection.date_naissance ?? ""} />
                      <LigneInfo label="Lieu de naissance" valeur={selection.lieu_naissance ?? ""} />
                      <LigneInfo label="Sexe" valeur={selection.sexe ?? ""} />
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Scolarité</div>
                      <LigneInfo label="Classe" valeur={selection.inscriptions?.[0]?.classe?.nom ?? ""} />
                      <LigneInfo label="Année scolaire" valeur={selection.inscriptions?.[0]?.anneeScolaire?.libelle ?? ""} />
                      <LigneInfo label="Date d'inscription" valeur={selection.inscriptions?.[0]?.date_inscription ?? ""} />
                      <LigneInfo label="Statut" valeur={selection.inscriptions?.[0]?.statut ?? ""} />

                      <div className="mb-1 mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Tuteur</div>
                      {selection.tuteur ? (
                        <>
                          <LigneInfo label="Nom" valeur={selection.tuteur.nom} />
                          <LigneInfo label="Téléphone" valeur={selection.tuteur.telephone ?? ""} />
                          <LigneInfo label="Email" valeur={selection.tuteur.email ?? ""} />
                          <LigneInfo label="Adresse" valeur={selection.tuteur.adresse ?? ""} />
                        </>
                      ) : (
                        <p className="text-sm text-slate-400">Aucun tuteur associé.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {estOuvert && panneau?.mode === "completer" && selection && (
                <form
                  key={selection.id}
                  className={`space-y-3 bg-slate-50 px-5 py-4 ${idx < eleves.length - 1 ? "border-b border-slate-100" : ""}`}
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    const f = new FormData(ev.currentTarget);
                    completerDossier.mutate({
                      id: selection.id,
                      date_naissance: String(f.get("date_naissance") ?? ""),
                      lieu_naissance: String(f.get("lieu_naissance") ?? ""),
                      sexe: String(f.get("sexe") ?? ""),
                      tuteur_email: String(f.get("tuteur_email") ?? ""),
                      tuteur_adresse: String(f.get("tuteur_adresse") ?? ""),
                    });
                  }}
                >
                  <div className="grid grid-cols-3 gap-3">
                    <label className="text-xs text-slate-600">
                      Date de naissance
                      <input
                        name="date_naissance"
                        type="date"
                        defaultValue={selection.date_naissance ?? ""}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-slate-600">
                      Lieu de naissance
                      <input
                        name="lieu_naissance"
                        defaultValue={selection.lieu_naissance ?? ""}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-slate-600">
                      Sexe
                      <select
                        name="sexe"
                        defaultValue={selection.sexe ?? ""}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">...</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </label>
                  </div>

                  {selection.tuteur ? (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs text-slate-600">
                        Email du tuteur ({selection.tuteur.nom})
                        <input
                          name="tuteur_email"
                          type="email"
                          defaultValue={selection.tuteur.email ?? ""}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-xs text-slate-600">
                        Adresse du tuteur
                        <input
                          name="tuteur_adresse"
                          defaultValue={selection.tuteur.adresse ?? ""}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600">
                      Aucun tuteur associé à cet élève — saisi au moment de l'inscription si besoin.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={completerDossier.isPending}
                    className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
                  >
                    {completerDossier.isPending ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </form>
              )}

              {estOuvert && panneau?.mode === "documents" && (
                <div className={`bg-slate-50 px-5 py-4 ${idx < eleves.length - 1 ? "border-b border-slate-100" : ""}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Documents ({documents?.length ?? 0})
                    </span>
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink-light">
                      <Upload size={13} />
                      {uploaderDocuments.isPending ? "Envoi..." : "Ajouter des fichiers"}
                      <input
                        ref={inputFichierRef}
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {documents?.length === 0 && (
                    <p className="text-sm text-slate-400">Aucun document pour l'instant.</p>
                  )}

                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                    {documents?.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <button
                          onClick={() => telechargerDocument(doc)}
                          className="text-left text-ink underline-offset-2 hover:underline"
                        >
                          {doc.nom_original}
                        </button>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{formatTaille(doc.taille)}</span>
                          <button
                            onClick={() => supprimerDocument.mutate(doc.id)}
                            className="text-slate-400 transition hover:text-red-600"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Formats acceptés : PDF, JPG, PNG, DOC, DOCX — 5 Mo maximum par fichier.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}