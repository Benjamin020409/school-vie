import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { api } from "@/lib/api";

type Niveau = { id: number; nom: string };
type Classe = { id: number; nom: string; niveau: { id: number; nom: string } };

type Rapport = {
  annee: string;
  periode: { debut: string; fin: string };
  situation: { eleves: number; attendu: number; paye: number; restant: number; taux: number | null; soldes: number };
  encaisse_periode: { montant: number; nombre: number };
  par_niveau: { niveau: string; eleves: number; attendu: number; paye: number; restant: number; soldes: number; taux: number | null }[];
  par_mode: { mode: string; nombre: number; montant: number }[];
  par_mois: { mois: string; nombre: number; montant: number }[];
  paiements: { id: number; date: string; numero_recu: string; eleve: string; classe: string; mode: string; montant: number }[];
  paiements_total: number;
  niveaux_sans_frais: string[];
};

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

function libelleMois(m: string) {
  return new Date(`${m}-01T00:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default function ComptableRapports() {
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [niveauId, setNiveauId] = useState("");
  const [classeId, setClasseId] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreurPdf, setErreurPdf] = useState<string | null>(null);

  const params = Object.fromEntries(
    Object.entries({ date_debut: dateDebut, date_fin: dateFin, niveau_id: niveauId, classe_id: classeId }).filter(([, v]) => v !== "")
  );

  const { data: niveaux } = useQuery<Niveau[]>({
    queryKey: ["niveaux"],
    queryFn: async () => (await api.get("/niveaux")).data,
  });

  const { data: classes } = useQuery<Classe[]>({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data,
  });

  const { data: rapport, isLoading, isError } = useQuery<Rapport>({
    queryKey: ["rapport-financier", params],
    queryFn: async () => (await api.get("/comptable/rapport-financier", { params })).data,
  });

  const classesDuNiveau = classes?.filter((c) => !niveauId || c.niveau.id === Number(niveauId)) ?? [];
  const maxMois = Math.max(1, ...(rapport?.par_mois.map((m) => m.montant) ?? [1]));

  async function telechargerPdf() {
    setErreurPdf(null);
    setEnCours(true);
    try {
      const response = await api.get("/comptable/rapport-financier/pdf", { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = "rapport-financier.pdf";
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setErreurPdf("Impossible de générer le PDF pour le moment.");
    } finally {
      setEnCours(false);
    }
  }

  const kpis = rapport
    ? [
        { label: `Encaissé sur la période (${rapport.encaisse_periode.nombre} paiement(s))`, valeur: fmt(rapport.encaisse_periode.montant), couleur: "text-ink" },
        { label: `Total attendu (${rapport.situation.eleves} élève(s))`, valeur: fmt(rapport.situation.attendu), couleur: "text-ink" },
        { label: "Restant dû", valeur: fmt(rapport.situation.restant), couleur: "text-red-600" },
        { label: "Taux de recouvrement", valeur: rapport.situation.taux !== null ? `${rapport.situation.taux} %` : "—", couleur: "text-emerald-600" },
      ]
    : [];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Rapports</h1>
        <button
          onClick={telechargerPdf}
          disabled={!rapport || enCours}
          className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
        >
          <FileDown size={15} />
          {enCours ? "Génération..." : "Télécharger (PDF)"}
        </button>
      </div>

      {erreurPdf && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreurPdf}</p>}

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Du</label>
          <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Au</label>
          <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
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
            <option value="">Tous</option>
            {niveaux?.map((n) => <option key={n.id} value={n.id}>{n.nom}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Classe</label>
          <select value={classeId} onChange={(e) => setClasseId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Toutes</option>
            {classesDuNiveau.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        {(dateDebut || dateFin || niveauId || classeId) && (
          <button
            onClick={() => { setDateDebut(""); setDateFin(""); setNiveauId(""); setClasseId(""); }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Réinitialiser
          </button>
        )}
        <p className="w-full text-xs text-slate-400">
          Sans dates, la période va du début de l'année scolaire active à aujourd'hui. Les encaissements suivent la période ; la situation (attendu, restant) est celle d'aujourd'hui.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Chargement...</p>}
      {isError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">Impossible de charger le rapport (vérifie qu'une année scolaire est active).</p>}

      {rapport && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">{k.label}</div>
                <div className={`mt-1 text-lg font-semibold ${k.couleur}`}>{k.valeur}</div>
              </div>
            ))}
          </div>

          {rapport.niveaux_sans_frais.length > 0 && (
            <p className="mb-6 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Frais de scolarité non définis pour : {rapport.niveaux_sans_frais.join(", ")}. Ces élèves ne sont pas comptés dans le total attendu.
            </p>
          )}

          <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">Situation par niveau</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium">Niveau</th>
                  <th className="px-4 py-2 text-right font-medium">Élèves</th>
                  <th className="px-4 py-2 text-right font-medium">Attendu</th>
                  <th className="px-4 py-2 text-right font-medium">Payé</th>
                  <th className="px-4 py-2 text-right font-medium">Restant</th>
                  <th className="px-4 py-2 text-right font-medium">Soldés</th>
                  <th className="px-4 py-2 text-right font-medium">Taux</th>
                </tr>
              </thead>
              <tbody>
                {rapport.par_niveau.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-3 text-slate-400">Aucun élève dans ce périmètre.</td></tr>
                )}
                {rapport.par_niveau.map((l) => (
                  <tr key={l.niveau} className="border-b border-slate-50">
                    <td className="px-4 py-2.5 text-slate-800">{l.niveau}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{l.eleves}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{fmt(l.attendu)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{fmt(l.paye)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${l.restant > 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(l.restant)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{l.soldes}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{l.taux !== null ? `${l.taux} %` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">Par mode de paiement</div>
              {rapport.par_mode.length === 0 && <div className="px-5 py-4 text-sm text-slate-400">Aucun paiement sur la période.</div>}
              {rapport.par_mode.map((l, idx) => (
                <div key={l.mode} className={`flex items-center justify-between px-5 py-3 text-sm ${idx < rapport.par_mode.length - 1 ? "border-b border-slate-100" : ""}`}>
                  <span className="text-slate-800">{l.mode}</span>
                  <span className="text-slate-500">{l.nombre} paiement(s)</span>
                  <span className="font-medium text-ink">{fmt(l.montant)}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">Par mois</div>
              {rapport.par_mois.length === 0 && <div className="px-5 py-4 text-sm text-slate-400">Aucun paiement sur la période.</div>}
              {rapport.par_mois.map((l, idx) => (
                <div key={l.mois} className={`px-5 py-3 text-sm ${idx < rapport.par_mois.length - 1 ? "border-b border-slate-100" : ""}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="capitalize text-slate-800">{libelleMois(l.mois)}</span>
                    <span className="font-medium text-ink">{fmt(l.montant)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-gold" style={{ width: `${(l.montant / maxMois) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
              Journal des paiements ({rapport.paiements_total})
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">N° reçu</th>
                  <th className="px-4 py-2 font-medium">Élève</th>
                  <th className="px-4 py-2 font-medium">Classe</th>
                  <th className="px-4 py-2 font-medium">Mode</th>
                  <th className="px-4 py-2 text-right font-medium">Montant</th>
                </tr>
              </thead>
              <tbody>
                {rapport.paiements.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-3 text-slate-400">Aucun paiement sur la période.</td></tr>
                )}
                {rapport.paiements.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50">
                    <td className="px-4 py-2.5 text-slate-500">{l.date}</td>
                    <td className="px-4 py-2.5 text-slate-500">{l.numero_recu}</td>
                    <td className="px-4 py-2.5 text-slate-800">{l.eleve}</td>
                    <td className="px-4 py-2.5 text-slate-500">{l.classe}</td>
                    <td className="px-4 py-2.5 text-slate-500">{l.mode}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-ink">{fmt(l.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rapport.paiements_total > rapport.paiements.length && (
              <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
                Les {rapport.paiements.length} derniers paiements sont affichés. Le PDF contient la liste complète.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}