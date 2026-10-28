import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users, School, BookOpen, FileText, Plus,  X, CreditCard, RefreshCw, CalendarClock, FileCheck2 } from "lucide-react";
import type { NavLien } from "../../layouts/AppLayout";
import { api } from "../../lib/api";

export const liensSecretaire: NavLien[] = [
  { to: "/secretaire", label: "Inscriptions", icon: UserPlus },
  { to: "/secretaire/eleves", label: "Élèves", icon: Users },
  { to: "/secretaire/classes", label: "Classes", icon: School },
  { to: "/secretaire/matieres", label: "Matières", icon: BookOpen },
  { to: "/secretaire/bulletins", label: "Bulletins", icon: FileCheck2 },
  { to: "/secretaire/cartes", label: "Cartes scolaires", icon: CreditCard },
  { to: "/secretaire/emploi-du-temps", label: "Emploi du temps", icon: CalendarClock },
  { to: "/secretaire/documents", label: "Documents", icon: FileText },
];

type Classe = { id: number; nom: string };
type AnneeScolaire = { id: number; libelle: string; active: boolean };
type Eleve = { id: number; nom: string; prenom: string; matricule: string };
type Inscription = {
  id: number;
  date_inscription: string;
  eleve: Eleve;
  classe: Classe;
};
type Stats = { nouvelles_inscriptions: number; dossiers_incomplets: number };

function genererMatricule() {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000); // 4 chiffres
  return `MAT-${year}-${random}`;
}

export default function SecretaireDashboard() {
  const queryClient = useQueryClient();
  const [formOuvert, setFormOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [matricule, setMatricule] = useState("");

  const { data: stats } = useQuery<Stats>({
    queryKey: ["inscriptions-stats"],
    queryFn: async () => (await api.get("/inscriptions/stats")).data,
  });

  const { data: inscriptions } = useQuery<Inscription[]>({
    queryKey: ["inscriptions-recentes"],
    queryFn: async () => (await api.get("/inscriptions?limit=5")).data,
  });

  const { data: classes } = useQuery<Classe[]>({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data,
  });

  const { data: annees } = useQuery<AnneeScolaire[]>({
    queryKey: ["annees-scolaires"],
    queryFn: async () => (await api.get("/annees-scolaires")).data,
  });

  const { data: resultatsRecherche } = useQuery<Eleve[]>({
    queryKey: ["eleves-recherche", recherche],
    queryFn: async () => (await api.get(`/eleves?q=${encodeURIComponent(recherche)}`)).data,
    enabled: recherche.trim().length >= 2,
  });

  const anneeActive = annees?.find((a) => a.active) ?? annees?.[0];

  const creerInscription = useMutation({
    mutationFn: async (payload: {
      matricule: string;
      nom: string;
      prenom: string;
      classe_id: string;
      tuteur_nom: string;
      tuteur_telephone: string;
    }) => {
      const { data: eleve } = await api.post("/eleves", {
        matricule: payload.matricule,
        nom: payload.nom,
        prenom: payload.prenom,
        tuteur_nom: payload.tuteur_nom || undefined,
        tuteur_telephone: payload.tuteur_telephone || undefined,
      });

      await api.post("/inscriptions", {
        eleve_id: eleve.id,
        classe_id: Number(payload.classe_id),
        annee_scolaire_id: anneeActive?.id,
        date_inscription: new Date().toISOString().slice(0, 10),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inscriptions-recentes"] });
      queryClient.invalidateQueries({ queryKey: ["inscriptions-stats"] });
      setFormOuvert(false);
      setMatricule("");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    creerInscription.mutate({
      matricule: String(form.get("matricule")),
      nom: String(form.get("nom")),
      prenom: String(form.get("prenom")),
      classe_id: String(form.get("classe_id")),
      tuteur_nom: String(form.get("tuteur_nom") ?? ""),
      tuteur_telephone: String(form.get("tuteur_telephone") ?? ""),
    });
  }


  function toggleFormulaire() {
    setFormOuvert((v) => {
      const nouvelEtat = !v;
      if (nouvelEtat) setMatricule(genererMatricule()); // pré-remplit à l'ouverture
      return nouvelEtat;
    });
  }

  const kpis = [
    { label: "Nouvelles inscriptions", valeur: stats?.nouvelles_inscriptions ?? "…" },
    {
      label: "Dossiers incomplets",
      valeur: stats?.dossiers_incomplets ?? "…",
      couleur: "text-amber-600",
    },
    { label: "Certificats à éditer", valeur: "2" },
  ];

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">
        Inscriptions
      </h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">{k.label}</div>
            <div className={`mt-1 text-xl font-semibold ${k.couleur ?? "text-ink"}`}>
              {k.valeur}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <span className="text-sm font-medium text-ink">Inscriptions récentes</span>
          <button
            onClick={toggleFormulaire}
            className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink-light"
          >
            {formOuvert ? <X size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
            {formOuvert ? "Annuler" : "Nouvelle inscription"}
          </button>
        </div>

        {formOuvert && (
          <form onSubmit={handleSubmit} className="space-y-3 border-b border-slate-100 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
              <input
                  name="matricule"
                  required
                  placeholder="Matricule"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setMatricule(genererMatricule())}
                  title="Générer un matricule"
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <RefreshCw size={13} strokeWidth={2} />
                  Générer
                </button>
                </div>
              <select name="classe_id" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Classe...</option>
                {classes?.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
              <input name="nom" required placeholder="Nom de l'élève" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input name="prenom" required placeholder="Prénom de l'élève" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input name="tuteur_nom" placeholder="Nom du tuteur (optionnel)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input name="tuteur_telephone" placeholder="Téléphone du tuteur" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>

            {!anneeActive && (
              <p className="text-xs text-amber-600">
                Aucune année scolaire active trouvée — l'inscription sera rattachée à la première année existante.
              </p>
            )}
            {creerInscription.isError && (
              <p className="text-xs text-red-600">
                Erreur lors de la création. Vérifie que le matricule n'existe pas déjà.
              </p>
            )}

            <button
              type="submit"
              disabled={creerInscription.isPending}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
            >
              {creerInscription.isPending ? "Enregistrement..." : "Enregistrer l'inscription"}
            </button>
          </form>
        )}

        {inscriptions?.length === 0 && (
          <div className="px-5 py-4 text-sm text-slate-400">Aucune inscription pour le moment.</div>
        )}

        {inscriptions?.map((i, idx) => (
          <div
            key={i.id}
            className={`flex items-center justify-between px-5 py-3 text-sm ${
              inscriptions.length && idx < inscriptions.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <span className="text-slate-800">
              {i.eleve.prenom} {i.eleve.nom} — {i.classe.nom}
            </span>
            <span className="text-slate-500">{i.date_inscription}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Recherche élève
        </label>
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Nom, prénom ou matricule (2 caractères min.)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
        />
        {recherche.trim().length >= 2 && (
          <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">
            {resultatsRecherche?.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-400">Aucun résultat.</div>
            )}
            {resultatsRecherche?.map((e) => (
              <div key={e.id} className="px-3 py-2 text-sm text-slate-700">
                {e.prenom} {e.nom} <span className="text-slate-400">— {e.matricule}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}