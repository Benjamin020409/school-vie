import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, type LucideIcon, GraduationCap } from "lucide-react";
import { logout } from "../lib/api";

export type NavLien = { to: string; label: string; icon: LucideIcon };

type AppLayoutProps = {
  liens: NavLien[];
  sousTitre: string;
};

export default function AppLayout({ liens, sousTitre }: AppLayoutProps) {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/connexion");
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 flex w-60 shrink-0 flex-col bg-ink text-white">
        <div className="px-5 py-5">
          <div className="flex font-display gap-2 text-lg font-semibold leading-tight">
            <GraduationCap size={22} strokeWidth={1.75} className="text-gold-soft" />
            SCHOOL VIE
          </div>
          <div className="mt-1 text-xs text-gold-soft">{sousTitre}</div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 pt-2">
          {liens.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-white/10 font-medium text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white/90"
                  }`
                }
              >
                <Icon size={16} strokeWidth={1.75} />
                {l.label}
              </NavLink>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mx-3 mb-4 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/50 transition hover:bg-white/5 hover:text-white/90"
        >
          <LogOut size={16} strokeWidth={1.75} />
          Se déconnecter
        </button>
      </aside>

      <main className="ml-60 flex-1 min-h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}