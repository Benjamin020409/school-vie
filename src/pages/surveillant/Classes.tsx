import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { api } from "../../lib/api";

type Classe = { id: number; nom: string; niveau: { id: number; nom: string } };

async function telechargerFichePresence(classe: Classe) {
  const response = await api.get(`/classes/${classe.id}/fiche-presence`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `fiche-presence-${classe.nom}.pdf`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(url);
}

export default function SurveillantClasses() {
  const [classeSelectionneeId, setClasseSelectionneeId] = useState<string>("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const { data: classes } = useQuery<Classe[]>({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data,
  });

  const classeSelectionnee = classes?.find((c) => c.id === Number(classeSelectionneeId)) ?? null;

  async function handleTelecharger() {
    if (!classeSelectionnee) return;
    setErreur(null);
    setEnCours(true);
    try {
      await telechargerFichePresence(classeSelectionnee);
    } catch {
      setErreur("Impossible de générer la fiche pour le moment.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Classe</h1>

      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-sm text-slate-500">
          Choisis une classe pour imprimer sa fiche de présence journalière — une case Absent / Retard par heure de cours (8h/jour), à cocher à la main.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Classe</label>
            <select
              value={classeSelectionneeId}
              onChange={(e) => setClasseSelectionneeId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Sélectionner...</option>
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>{c.nom} ({c.niveau.nom})</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleTelecharger}
            disabled={!classeSelectionneeId || enCours}
            className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
          >
            <FileDown size={15} />
            {enCours ? "Génération..." : "Télécharger la fiche (PDF)"}
          </button>
        </div>
      </div>
    </div>
  );
}