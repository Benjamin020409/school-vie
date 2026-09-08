export const ROLE_ROUTES: Record<string, string> = {
  admin: "/admin",
  direction: "/directeur",
  secretaire: "/secretaire",
  comptable: "/comptable",
  enseignant: "/enseignant",
  surveillant: "/surveillant",
  eleve: "/eleve",
  parent: "/tuteur",
};

export function routeForRoles(roles: string[]): string | null {
  for (const role of roles) {
    if (ROLE_ROUTES[role]) return ROLE_ROUTES[role];
  }
  return null;
}