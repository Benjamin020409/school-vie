import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileDown, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

type Classe = { id: number; nom: string; niveau: { id: number; nom: string } };
type Verification = {
  classe: string;
  total: number;
  avec_photo: number;
  sans_photo: { id: number; nom: string; prenom: string; matricule: string }[];
  pret: boolean;
};

const OPTIONS_PAR_PAGE = [4, 6, 8, 10];

export default function SecretaireCartesScolaires() {
  const [classeId, setClasseId] = useState("");
  const [parPage, setParPage] = useState(8);
  const [avecVerso, setAvecVerso] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const { data: classes } = useQuery<Classe[]>({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data,
  });

  const { data: verification, isFetching, refetch } = useQuery<Verification>({
    queryKey: ["cartes-verification", classeId],
    queryFn: async () => (await api.get(`/classes/${classeId}/cartes/verification`)).data,
    enabled: !!classeId,
  });

  const nbFeuilles = verification ? Math.ceil(verification.total / parPage) : 0;
  const nbPages = nbFeuilles * (avecVerso ? 2 : 1);

  async function telechargerCartes() {
    if (!classeId) return;
    setErreur(null);
    setEnCours(true);
    try {
      const response = await api.get(`/classes/${classeId}/cartes/pdf`, {
        params: { par_page: parPage, verso: avecVerso ? 1 : 0 },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `cartes-${verification?.classe ?? "classe"}.pdf`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setErreur("Impossible de générer les cartes. Revérifie que tous les élèves ont une photo, puis réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Cartes scolaires</h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-sm text-slate-500">
          Choisis une classe : le système vérifie que chaque élève a une photo, puis génère toutes les cartes de la classe en planches A4.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Classe</label>
            <select
              value={classeId}
              onChange={(e) => {
                setClasseId(e.target.value);
                setErreur(null);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Sélectionner...</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>{c.nom} ({c.niveau.nom})</option>
              ))}
            </select>
          </div>

          {classeId && (
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
              Revérifier
            </button>
          )}
        </div>
      </div>

      {classeId && verification && (
        <>
          <div className="mb-6 rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
              Contrôle des photos
            </div>
            <div className="px-5 py-4">
              {verification.total === 0 ? (
                <p className="text-sm text-slate-400">Aucun élève inscrit dans cette classe.</p>
              ) : verification.pret ? (
                <p className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 size={16} />
                  Les {verification.total} élèves ont une photo — l'impression est possible.
                </p>
              ) : (
                <>
                  <p className="mb-3 flex items-center gap-2 text-sm text-amber-700">
                    <AlertTriangle size={16} />
                    {verification.sans_photo.length} élève(s) sur {verification.total} sans photo. Ajoute-les d'abord pour pouvoir imprimer.
                  </p>
                  <ul className="mb-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {verification.sans_photo.map((e) => (
                      <li key={e.id} className="px-3 py-2 text-sm text-slate-700">
                        {e.prenom} {e.nom} <span className="text-slate-400">— {e.matricule}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/secretaire/eleves"
                    className="text-sm font-medium text-ink underline underline-offset-2"
                  >
                    Aller à la page Élèves (panneau « Carte scolaire ») pour ajouter les photos
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
              Mise en page
            </div>
            <div className="px-5 py-4">
              <div className="mb-4 flex flex-wrap items-end gap-6">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Cartes par feuille A4</label>
                  <select
                    value={parPage}
                    onChange={(e) => setParPage(Number(e.target.value))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {OPTIONS_PAR_PAGE.map((n) => (
                      <option key={n} value={n}>{n} cartes ({n / 2} lignes × 2 colonnes)</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={avecVerso} onChange={(e) => setAvecVerso(e.target.checked)} />
                  Imprimer aussi le verso (recto-verso)
                </label>
              </div>

              {verification.total > 0 && (
                <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {verification.total} carte(s) → <strong>{nbFeuilles} feuille(s) recto</strong>
                  {avecVerso && <> + <strong>{nbFeuilles} feuille(s) verso</strong></>}
                  , soit {nbPages} page(s) au total.
                </p>
              )}

              {erreur && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>}

              <button
                onClick={telechargerCartes}
                disabled={!verification.pret || enCours}
                className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileDown size={15} />
                {enCours ? "Génération en cours..." : "Générer les cartes (PDF)"}
              </button>

              {avecVerso && (
                <p className="mt-3 text-xs text-slate-400">
                  Les pages sont ordonnées recto, verso, recto, verso... Pour une impression recto-verso, choisis « retourner sur le bord long » dans les options de l'imprimante.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}