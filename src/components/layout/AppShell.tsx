import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";

const NAV = [
  { section: "Main" },
  { to: "/", label: "Dashboard", icon: "⊞" },
  { to: "/payroll", label: "Payroll", icon: "₦" },
  { to: "/staff", label: "Staff", icon: "👥" },
  { to: "/subjects", label: "Subjects", icon: "📚" },
  { to: "/leave", label: "Leave", icon: "📅" },
  { to: "/attendance", label: "Attendance", icon: "⏱" },
  { section: "Finance" },
  { to: "/compliance", label: "Compliance", icon: "🛡" },
  { section: "Settings" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export default function AppShell() {
  const { org, orgLoading, session, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!orgLoading && !org) navigate("/onboarding");
  }, [org, orgLoading]);

  const email = session?.user?.email ?? "";

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 shrink-0 bg-surface border-r border-line flex flex-col">
        <div className="px-5 py-4 border-b border-line flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent grid place-items-center font-display text-[13px] font-extrabold text-white">
            S
          </div>
          <div className="font-display text-[15px] font-extrabold text-white">
            Staff<span className="text-accent">Stack</span>
          </div>
        </div>

        {org && (
          <div className="mx-3 mt-3 px-2.5 py-2 bg-surface2 border border-line rounded-lg flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-warn to-amber-700 grid place-items-center text-[10px] font-bold text-white shrink-0">
              {org.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-xs font-semibold text-white truncate">
              {org.name}
            </div>
          </div>
        )}

        <nav className="flex-1 p-2 overflow-y-auto">
          {NAV.map((item, i) =>
            "section" in item && item.section ? (
              <div
                key={i}
                className="font-mono text-[9px] uppercase tracking-widest text-mut px-2.5 pt-3 pb-1"
              >
                {item.section}
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to!}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-accent-dim text-accent"
                      : "text-mut2 hover:bg-surface2 hover:text-ink"
                  }`
                }
              >
                <span className="w-4 text-center text-sm">{item.icon}</span>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="p-3 border-t border-line flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-blue-800 grid place-items-center text-[11px] font-bold text-white shrink-0">
            {email.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {email}
            </div>
            <button
              onClick={signOut}
              className="text-[10px] text-mut hover:text-danger"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
