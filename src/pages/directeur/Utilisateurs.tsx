import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

type Utilisateur = {
  id: number;
  name: string;
  email: string;
  roles: { id: number; name: string }[];
};

const LIBELLES_ROLES: Record<string, string> = {
  secretaire: "Secrétaire",
  surveillant: "Surveillant",
  comptable: "Comptable",
};

function messageErreur(error: unknown, defaut: string) {
  const reponse = (error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data;
  return (reponse?.errors ? Object.values(reponse.errors)[0]?.[0] : reponse?.message) ?? defaut;
}

export default function DirecteurUtilisateurs() {
  const queryClient = useQueryClient();
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data: utilisateurs } = useQuery<Utilisateur[]>({
    queryKey: ["utilisateurs"],
    queryFn: async () => (await api.get("/utilisateurs")).data,
  });

  const creerUtilisateur = useMutation({
    mutationFn: async (payload: { name: string; email: string; role: string }) =>
      api.post("/utilisateurs", payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
      setErreur(null);
      setMessage(`Compte créé pour ${variables.name}. Mot de passe par défaut : password`);
    },
    onError: (error) => {
      setMessage(null);
      setErreur(messageErreur(error, "Impossible de créer ce compte."));
    },
  });

  const reinitialiser = useMutation({
    mutationFn: async (id: number) => api.put(`/utilisateurs/${id}/reinitialiser-mot-de-passe`),
    onSuccess: () => {
      setErreur(null);
      setMessage("Mot de passe réinitialisé à : password");
    },
    onError: (error) => {
      setMessage(null);
      setErreur(messageErreur(error, "Impossible de réinitialiser le mot de passe."));
    },
  });

  const supprimer = useMutation({
    mutationFn: async (id: number) => api.delete(`/utilisateurs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
      setErreur(null);
      setMessage("Compte supprimé.");
    },
    onError: (error) => {
      setMessage(null);
      setErreur(messageErreur(error, "Impossible de supprimer ce compte."));
    },
  });

  function handleSupprimer(u: Utilisateur) {
    if (!confirm(`Supprimer le compte de ${u.name} ? Cette personne ne pourra plus se connecter.`)) return;
    setMessage(null);
    supprimer.mutate(u.id);
  }

  function handleReinitialiser(u: Utilisateur) {
    if (!confirm(`Réinitialiser le mot de passe de ${u.name} à "password" ?`)) return;
    setMessage(null);
    reinitialiser.mutate(u.id);
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Autres utilisateurs</h1>

      {erreur && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erreur}</p>}
      {message && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5 text-sm font-medium text-ink">
          Comptes existants (secrétariat, surveillance, comptabilité)
        </div>

        {utilisateurs?.length === 0 && (
          <div className="px-5 py-4 text-sm text-slate-400">Aucun compte pour l'instant.</div>
        )}

        {utilisateurs?.map((u, idx) => (
          <div
            key={u.id}
            className={`flex items-center justify-between gap-3 px-5 py-3 text-sm ${
              utilisateurs.length && idx < utilisateurs.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <span className="w-48 shrink-0 font-medium text-slate-800">{u.name}</span>
            <span className="flex-1 text-slate-500">{u.email}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {LIBELLES_ROLES[u.roles[0]?.name] ?? u.roles[0]?.name}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleReinitialiser(u)}
                title="Réinitialiser le mot de passe"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-ink transition hover:bg-slate-50"
              >
                <RotateCcw size={12} />
                Mot de passe
              </button>
              <button
                onClick={() => handleSupprimer(u)}
                title="Supprimer le compte"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-red-600 transition hover:bg-red-50"
              >
                <Trash2 size={12} />
                Supprimer
              </button>
            </div>
          </div>
        ))}

        <form
          className="grid grid-cols-2 gap-3 border-t border-slate-100 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setMessage(null);
            creerUtilisateur.mutate({
              name: String(f.get("name")),
              email: String(f.get("email")),
              role: String(f.get("role")),
            });
            e.currentTarget.reset();
          }}
        >
          <input name="name" required placeholder="Nom complet" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="email" type="email" required placeholder="Email (sert à se connecter)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select name="role" required defaultValue="" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="" disabled>Choisir un rôle...</option>
            <option value="secretaire">Secrétaire</option>
            <option value="surveillant">Surveillant</option>
            <option value="comptable">Comptable</option>
          </select>
          <button
            type="submit"
            disabled={creerUtilisateur.isPending}
            className="flex w-fit items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-ink-light disabled:opacity-60"
          >
            <Plus size={14} /> Créer le compte
          </button>
          <p className="col-span-2 text-xs text-slate-400">
            Le compte est créé avec le mot de passe par défaut <code className="rounded bg-slate-100 px-1">password</code>. Communique-le à la personne et demande-lui de le changer dès sa première connexion.
          </p>
        </form>
      </div>
    </div>
  );
}