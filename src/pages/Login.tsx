import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { login } from "../lib/api";
import { routeForRoles } from "../config/roles";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const user = await login(email, password);
      const destination = routeForRoles(user.roles.map((r) => r.name));

      if (!destination) {
        setErreur("Ce compte n'a aucun rôle assigné. Contactez l'administrateur.");
        return;
      }

      navigate(destination);
    } catch {
      setErreur("Identifiants incorrects. Vérifiez votre email et mot de passe.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="flex w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
  className="relative hidden w-2/5 flex-col justify-between overflow-hidden bg-ink p-8 text-white md:flex"
  style={{
    backgroundImage:
      "linear-gradient(to right, rgba(201,162,39,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(201,162,39,0.18) 1px, transparent 1px)",
    backgroundSize: "24px 24px",
  }}
>
  <div>
    <div className="flex items-center gap-2 font-display text-xl font-semibold leading-tight">
      <GraduationCap size={22} strokeWidth={1.75} className="text-gold-soft" />
      SCHOOL VIE
    </div>
    <div className="mt-1.5 text-xs text-gold-soft">
      Gestion scolaire
    </div>
  </div>
  <div className="text-xs text-white/50">Année 2026–2027</div>
</div>

        <div className="flex-1 px-8 py-10">
          <h1 className="font-display mb-1 text-lg font-semibold text-ink">
            Connexion
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Accédez à votre espace
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                placeholder="nom@ecole.tg"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                placeholder="••••••••"
              />
            </div>

            {erreur && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {erreur}
              </p>
            )}

            <button
              type="submit"
              disabled={chargement}
              className="w-full rounded-lg bg-ink py-2 text-sm font-medium text-white transition hover:bg-ink-light disabled:opacity-60"
            >
              {chargement ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}