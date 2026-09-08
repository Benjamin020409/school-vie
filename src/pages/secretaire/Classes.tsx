import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "../../lib/api";

type MatiereResume = { id: number; nom: string };
type Niveau = { id: number; nom: string; matieres?: MatiereResume[] };
type AnneeScolaire = { id: number; libelle: string; date_debut: string; date_fin: string; active: boolean };
type Classe = { id: number; nom: string; niveau: Niveau; capacite_max: number | null };
type Periode = { id: number; nom: string; date_debut: string; date_fin: string };

function Section({ titre, enfants, formulaire }: { titre: string; enfants: React.ReactNode; formulaire: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">{titre}</div>
      {enfants}
      <div className="border-t border-slate-100 px-5 py-4">{formulaire}</div>
    </div>
  );
}

export default function SecretaireClasses() {
  const queryClient = useQueryClient();

  const { data: annees } = useQuery<AnneeScolaire[]>({
    queryKey: ["annees-scolaires"],
    queryFn: async () => (await api.get("/annees-scolaires")).data,
  });

  const { data: niveaux } = useQuery<Niveau[]>({
    queryKey: ["niveaux"],
    queryFn: async () => (await api.get("/niveaux")).data,
  });

  const { data: classes } = useQuery<Classe[]>({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data,
  });

  const { data: periodes } = useQuery<Periode[]>({
    queryKey: ["periodes"],
    queryFn: async () => (await api.get("/periodes")).data,
  });

  const [erreur, setErreur] = useState<string | null>(null);
  const [editionAnneeId, setEditionAnneeId] = useState<number | null>(null);
  const [dateDebutEdition, setDateDebutEdition] = useState("");
  const [dateFinEdition, setDateFinEdition] = useState("");
  const [activeEdition, setActiveEdition] = useState(false);

  const modifierAnnee = useMutation({
    mutationFn: async ({ id, date_debut, date_fin, active }: { id: number; date_debut: string; date_fin: string; active: boolean }) =>
      api.put(`/annees-scolaires/${id}`, { date_debut, date_fin, active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["annees-scolaires"] });
      setErreur(null);
      setEditionAnneeId(null);
    },
    onError: () => setErreur("Impossible de modifier cette année (date de fin avant la date de début ?)."),
  });

  const creerAnnee = useMutation({
    mutationFn: async (payload: { libelle: string; date_debut: string; date_fin: string; active: boolean }) =>
      api.post("/annees-scolaires", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["annees-scolaires"] });
      setErreur(null);
    },
    onError: () => setErreur("Impossible de créer cette année (libellé déjà utilisé ?)."),
  });

  const creerPeriode = useMutation({
    mutationFn: async (payload: { nom: string; date_debut: string; date_fin: string }) =>
      api.post("/periodes", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodes"] });
      setErreur(null);
    },
    onError: (error: unknown) => {
      const reponse = (error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data;
      const premierMessage = reponse?.errors ? Object.values(reponse.errors)[0]?.[0] : reponse?.message;
      setErreur(premierMessage ?? "Impossible de créer cette période.");
    },
  });

  const creerNiveau = useMutation({
    mutationFn: async (payload: { nom: string }) => api.post("/niveaux", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["niveaux"] });
      setErreur(null);
    },
    onError: () => setErreur("Ce niveau existe déjà."),
  });

  const creerClasse = useMutation({
    mutationFn: async (payload: { nom: string; niveau_id: string; annee_scolaire_id: string; capacite_max: string }) =>
      api.post("/classes", {
        nom: payload.nom,
        niveau_id: Number(payload.niveau_id),
        annee_scolaire_id: Number(payload.annee_scolaire_id),
        capacite_max: payload.capacite_max ? Number(payload.capacite_max) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setErreur(null);
    },
    onError: () => setErreur("Impossible de créer cette classe."),
  });

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Classes</h1>

      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>
      )}

      <Section
        titre="Années scolaires"
        enfants={
          <>
            {annees?.length === 0 && <div className="px-5 py-3 text-sm text-slate-400">Aucune année créée.</div>}
            {annees?.map((a, idx) => (
              <div key={a.id} className={idx < annees.length - 1 ? "border-b border-slate-100" : ""}>
                <div className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="text-slate-800">{a.libelle}</span>
                  {editionAnneeId === a.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={dateDebutEdition}
                        onChange={(e) => setDateDebutEdition(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      />
                      <span className="text-slate-400">→</span>
                      <input
                        type="date"
                        value={dateFinEdition}
                        onChange={(e) => setDateFinEdition(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                  ) : (
                    <span className="text-slate-500">{a.date_debut} → {a.date_fin}</span>
                  )}
                  {editionAnneeId === a.id ? (
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={activeEdition}
                        onChange={(e) => setActiveEdition(e.target.checked)}
                      />
                      Active
                    </label>
                  ) : (
                    a.active && <span className="text-emerald-600">Active</span>
                  )}
                  {editionAnneeId === a.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          modifierAnnee.mutate({
                            id: a.id,
                            date_debut: dateDebutEdition,
                            date_fin: dateFinEdition,
                            active: activeEdition,
                          })
                        }
                        disabled={modifierAnnee.isPending}
                        className="rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-white hover:bg-ink-light disabled:opacity-60"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setEditionAnneeId(null)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditionAnneeId(a.id);
                        setDateDebutEdition(a.date_debut);
                        setDateFinEdition(a.date_fin);
                        setActiveEdition(a.active);
                      }}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-ink hover:bg-slate-50"
                    >
                      Modifier
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        }
        formulaire={
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              creerAnnee.mutate({
                libelle: String(f.get("libelle")),
                date_debut: String(f.get("date_debut")),
                date_fin: String(f.get("date_fin")),
                active: f.get("active") === "on",
              });
              e.currentTarget.reset();
            }}
          >
            <input name="libelle" required placeholder="ex: 2026-2027" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="date_debut" type="date" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="date_fin" type="date" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <input name="active" type="checkbox" /> Active
            </label>
            <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-ink-light">
              <Plus size={14} /> Ajouter
            </button>
          </form>
        }
      />

      <Section
        titre="Périodes (trimestres)"
        enfants={
          <>
            {periodes?.length === 0 && <div className="px-5 py-3 text-sm text-slate-400">Aucune période créée.</div>}
            {periodes?.map((p, idx) => (
              <div key={p.id} className={`flex items-center justify-between px-5 py-2.5 text-sm ${idx < periodes.length - 1 ? "border-b border-slate-100" : ""}`}>
                <span className="text-slate-800">{p.nom}</span>
                <span className="text-slate-500">{p.date_debut} → {p.date_fin}</span>
              </div>
            ))}
          </>
        }
        formulaire={
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              creerPeriode.mutate({
                nom: String(f.get("nom")),
                date_debut: String(f.get("date_debut")),
                date_fin: String(f.get("date_fin")),
              });
              e.currentTarget.reset();
            }}
          >
            <input name="nom" required placeholder="ex: Trimestre 1" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="date_debut" type="date" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="date_fin" type="date" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-ink-light">
              <Plus size={14} /> Ajouter
            </button>
            <p className="w-full text-xs text-slate-400">Rattachée automatiquement à l'année scolaire active.</p>
          </form>
        }
      />

      <Section
        titre="Niveaux"
        enfants={
          <div className="flex flex-wrap gap-2 px-5 py-3">
            {niveaux?.length === 0 && <span className="text-sm text-slate-400">Aucun niveau créé.</span>}
            {niveaux?.map((n) => (
              <span key={n.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{n.nom}</span>
            ))}
          </div>
        }
        formulaire={
          <form
            className="flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              creerNiveau.mutate({ nom: String(f.get("nom")) });
              e.currentTarget.reset();
            }}
          >
            <input name="nom" required placeholder="ex: 6ème" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-ink-light">
              <Plus size={14} /> Ajouter
            </button>
          </form>
        }
      />

      <Section
        titre="Classes"
        enfants={
          <>
            {classes?.length === 0 && <div className="px-5 py-3 text-sm text-slate-400">Aucune classe créée.</div>}
            {classes?.map((c, idx) => (
              <div key={c.id} className={`flex items-center justify-between px-5 py-2.5 text-sm ${idx < classes.length - 1 ? "border-b border-slate-100" : ""}`}>
                <span className="text-slate-800">{c.nom}</span>
                <span className="text-slate-500">{c.niveau?.nom}</span>
                {c.capacite_max && <span className="text-slate-400">{c.capacite_max} places max</span>}
              </div>
            ))}
          </>
        }
        formulaire={
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              creerClasse.mutate({
                nom: String(f.get("nom")),
                niveau_id: String(f.get("niveau_id")),
                annee_scolaire_id: String(f.get("annee_scolaire_id")),
                capacite_max: String(f.get("capacite_max") ?? ""),
              });
              e.currentTarget.reset();
            }}
          >
            <input name="nom" required placeholder="ex: 6ème A" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select name="niveau_id" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Niveau...</option>
              {niveaux?.map((n) => <option key={n.id} value={n.id}>{n.nom}</option>)}
            </select>
            <select name="annee_scolaire_id" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Année scolaire...</option>
              {annees?.map((a) => <option key={a.id} value={a.id}>{a.libelle}</option>)}
            </select>
            <input name="capacite_max" type="number" min="1" placeholder="Capacité (optionnel)" className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-ink-light">
              <Plus size={14} /> Ajouter
            </button>
          </form>
        }
      />
    </div>
  );
}