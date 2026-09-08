import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getUser } from "../lib/api";
import type { Role } from "../lib/api";
import { routeForRoles } from "../config/roles";

type Props = {
  role: string;
  children: React.ReactNode;
};

type Etat =
  | { statut: "chargement" }
  | { statut: "autorise" }
  | { statut: "non-connecte" }
  | { statut: "mauvais-role"; destination: string | null };

export default function ProtectedRoute({ role, children }: Props) {
  const [etat, setEtat] = useState<Etat>({ statut: "chargement" });

  useEffect(() => {
    let annule = false;

    getUser()
      .then((user) => {
        if (annule) return;
        const nomsRoles = user.roles.map((r: Role) => r.name);
        if (nomsRoles.includes(role)) {
          setEtat({ statut: "autorise" });
        } else {
          setEtat({ statut: "mauvais-role", destination: routeForRoles(nomsRoles) });
        }
      })
      .catch(() => {
        if (!annule) setEtat({ statut: "non-connecte" });
      });

    return () => {
      annule = true;
    };
  }, [role]);

  if (etat.statut === "chargement") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Chargement...
      </div>
    );
  }

  if (etat.statut === "non-connecte") {
    return <Navigate to="/connexion" replace />;
  }

  if (etat.statut === "mauvais-role") {
    return <Navigate to={etat.destination ?? "/connexion"} replace />;
  }

  return <>{children}</>;
}