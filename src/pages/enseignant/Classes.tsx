import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { api } from "../../lib/api";

type MesClasses = { id: number; nom: string; niveau: string; matieres: string[] };

async function telechargerListe(classe: MesClasses) {
  const response = await api.get(`/mon-espace/classes/${classe.id}/liste-pdf`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `liste-${classe.nom}.pdf`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(url);
}

export default function EnseignantClasses() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCoursId, setEnCoursId] = useState<number | null>(null);

  const { data: mesClasses } = useQuery<MesClasses[]>({
    queryKey: ["mes-classes"],
    queryFn: async () => (await api.get("/mon-espace/mes-classes")).data,
  });

  async function handleTelecharger(c: MesClasses) {
    setErreur(null);
    setEnCoursId(c.id);
    try {
      await telechargerListe(c);
    } catch {
      setErreur("Impossible de générer la liste pour le moment.");
    } finally {
      setEnCoursId(null);
    }
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Liste de classe</h1>

      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        {mesClasses?.length === 0 && (
          <div className="px-5 py-4 text-sm text-slate-400">
            Aucune classe pour l'instant — la direction doit d'abord t'affecter à une classe.
          </div>
        )}
        {mesClasses?.map((c, idx) => (
          <div
            key={c.id}
            className={`flex items-center justify-between px-5 py-3 text-sm ${
              mesClasses.length && idx < mesClasses.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <div>
              <span className="font-medium text-slate-800">{c.nom}</span>
              <span className="ml-2 text-slate-400">{c.niveau}</span>
            </div>
            <span className="text-slate-500">{c.matieres.join(", ")}</span>
            <button
              onClick={() => handleTelecharger(c)}
              disabled={enCoursId === c.id}
              className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
            >
              <FileDown size={13} />
              {enCoursId === c.id ? "Génération..." : "Télécharger (PDF)"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}