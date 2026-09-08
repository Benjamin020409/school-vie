import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "../../lib/api";

type MatiereResume = { id: number; nom: string };
type Niveau = { id: number; nom: string; matieres?: (MatiereResume & { pivot: { coefficient: string | number } })[] };
type Classe = { id: number; nom: string; niveau: { id: number; nom: string } };
type Affectation = { id: number; matiere: MatiereResume; classe: { id: number; nom: string } };
type Enseignant = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  affectations: Affectation[];
  specialites: MatiereResume[];
};

export default function DirecteurEnseignants() {
  const queryClient = useQueryClient();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enseignantSelectionneId, setEnseignantSelectionneId] = useState<string>("");
  const [niveauFiltreId, setNiveauFiltreId] = useState<string>("");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [specialitesSelection, setSpecialitesSelection] = useState<Set<number>>(new Set());

  const { data: enseignants } = useQuery<Enseignant[]>({
    queryKey: ["enseignants"],
    queryFn: async () => (await api.get("/enseignants")).data,
  });

  const { data: niveaux } = useQuery<Niveau[]>({
    queryKey: ["niveaux"],
    queryFn: async () => (await api.get("/niveaux")).data,
  });

  const { data: classes } = useQuery<Classe[]>({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data,
  });

  const { data: matieres } = useQuery<MatiereResume[]>({
    queryKey: ["matieres"],
    queryFn: async () => (await api.get("/matieres")).data,
  });

  const enseignantSelectionne = enseignants?.find((e) => e.id === Number(enseignantSelectionneId)) ?? null;
  const niveauFiltre = niveaux?.find((n) => n.id === Number(niveauFiltreId)) ?? null;
  const classesDuNiveauFiltre = classes?.filter((c) => c.niveau.id === Number(niveauFiltreId)) ?? [];

  // Réinitialise sélection + spécialités uniquement quand on change d'enseignant
  useEffect(() => {
    setNiveauFiltreId("");
    if (!enseignantSelectionne) {
      setSelection(new Set());
      setSpecialitesSelection(new Set());
      return;
    }
    setSelection(new Set(enseignantSelectionne.affectations.map((a) => `${a.classe.id}-${a.matiere.id}`)));
    setSpecialitesSelection(new Set(enseignantSelectionne.specialites.map((s) => s.id)));
  }, [enseignantSelectionneId]);

  const nombreAffectationsAutresNiveaux = enseignantSelectionne
    ? Array.from(selection).filter((cle) => {
        const classeId = Number(cle.split("-")[0]);
        const classe = classes?.find((c) => c.id === classeId);
        return classe && classe.niveau.id !== Number(niveauFiltreId);
      }).length
    : 0;

  // Matières du niveau affiché, filtrées par ce que l'enseignant est déclaré savoir enseigner
  const matieresDisponibles = (niveauFiltre?.matieres ?? []).filter((m) => specialitesSelection.has(m.id));

  const creerEnseignant = useMutation({
    mutationFn: async (payload: { nom: string; prenom: string; email: string; telephone: string }) =>
      api.post("/enseignants", {
        nom: payload.nom,
        prenom: payload.prenom,
        email: payload.email,
        telephone: payload.telephone || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enseignants"] });
      setErreur(null);
    },
    onError: () => setErreur("Impossible de créer cet enseignant (email déjà utilisé ?)."),
  });

  const enregistrerSpecialites = useMutation({
    mutationFn: async () =>
      api.put(`/enseignants/${enseignantSelectionneId}/specialites`, {
        matiere_ids: Array.from(specialitesSelection),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enseignants"] });
      setErreur(null);
    },
    onError: () => setErreur("Impossible d'enregistrer les spécialités."),
  });

  const enregistrerAffectations = useMutation({
  mutationFn: async () => {
    // On sauvegarde d'abord les spécialités cochées à l'instant T, pour que les deux
    // tables restent cohérentes même si le bouton dédié aux spécialités n'a pas été cliqué.
    await api.put(`/enseignants/${enseignantSelectionneId}/specialites`, {
      matiere_ids: Array.from(specialitesSelection),
    });

    const affectations = Array.from(selection).map((cle) => {
      const [classe_id, matiere_id] = cle.split("-").map(Number);
      return { classe_id, matiere_id };
    });
    return api.put(`/enseignants/${enseignantSelectionneId}/affectations`, { affectations });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["enseignants"] });
    setErreur(null);
  },
  onError: () => setErreur("Impossible d'enregistrer les affectations."),
});

  function toggle(classeId: number, matiereId: number) {
    const cle = `${classeId}-${matiereId}`;
    setSelection((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });
  }

  function toggleSpecialite(matiereId: number) {
    setSpecialitesSelection((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(matiereId)) suivant.delete(matiereId);
      else suivant.add(matiereId);
      return suivant;
    });
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Enseignants</h1>

      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Tous les enseignants
        </div>

        {enseignants?.length === 0 && (
          <div className="px-5 py-4 text-sm text-slate-400">Aucun enseignant créé.</div>
        )}

        {enseignants?.map((e, idx) => (
          <div
            key={e.id}
            className={`flex items-center justify-between px-5 py-3 text-sm ${
              idx < enseignants.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <div>
              <span className="font-medium text-slate-800">{e.prenom} {e.nom}</span>
              <span className="ml-2 text-slate-400">{e.email}</span>
            </div>
            <span className="text-slate-500">
              {e.specialites.length > 0 ? e.specialites.map((s) => s.nom).join(", ") : "Aucune spécialité"}
            </span>
            <span className="text-slate-400">{e.affectations.length} affectation(s)</span>
          </div>
        ))}

        <form
          className="grid grid-cols-2 gap-3 border-t border-slate-100 px-5 py-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            const f = new FormData(ev.currentTarget);
            creerEnseignant.mutate({
              nom: String(f.get("nom")),
              prenom: String(f.get("prenom")),
              email: String(f.get("email")),
              telephone: String(f.get("telephone") ?? ""),
            });
            ev.currentTarget.reset();
          }}
        >
          <input name="prenom" required placeholder="Prénom" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="nom" required placeholder="Nom" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="email" type="email" required placeholder="Email (sert au compte de connexion)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="telephone" placeholder="Téléphone (optionnel)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button
            type="submit"
            disabled={creerEnseignant.isPending}
            className="col-span-2 flex w-fit items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-ink-light disabled:opacity-60"
          >
            <Plus size={14} /> Ajouter
          </button>
          <p className="col-span-2 text-xs text-slate-400">
            Un compte de connexion (rôle enseignant) est créé automatiquement avec cet email, mot de passe par défaut : <code className="rounded bg-slate-100 px-1">password</code>. Les spécialités se règlent juste en dessous, une fois l'enseignant créé.
          </p>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Affecter des classes et matières
        </div>
        <div className="px-5 py-4">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <select
              value={enseignantSelectionneId}
              onChange={(e) => setEnseignantSelectionneId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">1. Choisir un enseignant...</option>
              {enseignants?.map((e) => (
                <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
              ))}
            </select>

            <select
              value={niveauFiltreId}
              onChange={(e) => setNiveauFiltreId(e.target.value)}
              disabled={!enseignantSelectionneId}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">3. Choisir un niveau...</option>
              {niveaux?.map((n) => (
                <option key={n.id} value={n.id}>{n.nom}</option>
              ))}
            </select>
          </div>

          {!enseignantSelectionneId && (
            <p className="text-sm text-slate-400">Sélectionne d'abord un enseignant.</p>
          )}

          {enseignantSelectionneId && (
            <div className="mb-5 rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  2. Spécialités (matières que cet enseignant peut enseigner)
                </span>
                <button
                  onClick={() => enregistrerSpecialites.mutate()}
                  disabled={enregistrerSpecialites.isPending}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-ink hover:bg-slate-50 disabled:opacity-60"
                >
                  {enregistrerSpecialites.isPending ? "..." : "Enregistrer"}
                </button>
              </div>
              {matieres?.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune matière créée pour l'instant.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {matieres?.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={specialitesSelection.has(m.id)}
                        onChange={() => toggleSpecialite(m.id)}
                      />
                      {m.nom}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {enseignantSelectionneId && !niveauFiltreId && (
            <p className="text-sm text-slate-400">Choisis un niveau pour afficher ses classes.</p>
          )}

          {enseignantSelectionneId && niveauFiltreId && (
            <>
              {nombreAffectationsAutresNiveaux > 0 && (
                <p className="mb-3 text-xs text-slate-400">
                  {nombreAffectationsAutresNiveaux} affectation(s) déjà enregistrée(s) sur d'autres niveaux — elles seront conservées.
                </p>
              )}

              {specialitesSelection.size === 0 ? (
                <p className="text-sm text-amber-600">
                  Aucune spécialité cochée pour cet enseignant — coche au moins une matière ci-dessus pour pouvoir l'affecter.
                </p>
              ) : classesDuNiveauFiltre.length === 0 ? (
                <p className="text-sm text-amber-600">Aucune classe créée pour ce niveau.</p>
              ) : matieresDisponibles.length === 0 ? (
                <p className="text-sm text-amber-600">
                  Aucune matière de ce niveau ne correspond aux spécialités de cet enseignant.
                </p>
              ) : (
                <div className="space-y-2">
                  {classesDuNiveauFiltre.map((classe) => (
                    <div key={classe.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="mb-2 text-sm font-medium text-slate-700">{classe.nom}</div>
                      <div className="flex flex-wrap gap-2">
                        {matieresDisponibles.map((m) => (
                          <label
                            key={m.id}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selection.has(`${classe.id}-${m.id}`)}
                              onChange={() => toggle(classe.id, m.id)}
                            />
                            {m.nom}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {enseignantSelectionneId && (
            <button
              onClick={() => enregistrerAffectations.mutate()}
              disabled={enregistrerAffectations.isPending}
              className="mt-4 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
            >
              {enregistrerAffectations.isPending ? "Enregistrement..." : "Enregistrer les affectations"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}