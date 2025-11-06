import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import { CreateTicketModal } from "./components/CreateTicketModal";
import { Dashboard } from "./components/Dashboard";
import { useApiHealth } from "./hooks/useApiHealth";
import { useStaffSettingsQuery } from "./hooks/useStaffSettings";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { StaffPanelPage } from "./pages/StaffPanelPage";
import { TicketsPage } from "./pages/TicketsPage";
import { useStaffAuth } from "./lib/staffAuth";
import { defaultStaffSiteSettings } from "./lib/staffSettings";
import { applyTheme } from "./lib/theme";

type NavItem = {
  to: string;
  label: string;
  requiresAuth?: boolean;
};

const navigation: NavItem[] = [{ to: "/staff", label: "Staff Login" }];

export default function App() {
  const { data: health, isFetching } = useApiHealth();
  const [isCreateTicketOpen, setCreateTicketOpen] = useState(false);
  const { isAuthenticated } = useStaffAuth();
  const settingsQuery = useStaffSettingsQuery();

  const siteSettings = useMemo(
    () => settingsQuery.data?.site ?? defaultStaffSiteSettings,
    [settingsQuery.data?.site]
  );

  useEffect(() => {
    if (settingsQuery.data?.theme) {
      applyTheme(settingsQuery.data.theme);
    }
  }, [settingsQuery.data?.theme]);

  if (settingsQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-slate-200">
        Loading control surface…
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-slate-200">
        Unable to load staff settings. Please try again later.
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-surface text-slate-100">
      <aside className="hidden flex-col border-r border-surface-subtle bg-surface-muted/40 p-6 lg:flex">
        <div className="mb-8">
          <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
            {siteSettings.brandLabel}
          </span>
          <h1 className="mt-2 text-xl font-semibold text-white">
            {siteSettings.brandHeading}
          </h1>
        </div>
        <nav className="flex flex-col gap-2">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/overview" || item.to === "/staff"}
              className={({ isActive }) =>
                [
                  "rounded-xl px-4 py-2 text-sm transition-colors",
                  item.requiresAuth && !isAuthenticated
                    ? "pointer-events-none opacity-30"
                    : isActive
                    ? "bg-primary/20 text-white"
                    : "text-slate-400 hover:bg-surface-subtle hover:text-white"
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {siteSettings.showGuildCard ? (
          <div className="mt-auto rounded-xl border border-surface-subtle bg-surface p-4 text-sm text-slate-400">
            <p className="font-medium text-slate-200">
              Guild: {siteSettings.guildName || "—"}
            </p>
            <p className="text-xs">Moderators online: 14</p>
          </div>
        ) : null}
      </aside>

      <main className="flex flex-col">
        <header className="flex items-center justify-between border-b border-surface-subtle bg-surface/80 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              {siteSettings.headerNote}
            </p>
            <h2 className="text-lg font-semibold text-white">
              {siteSettings.headerGreeting}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
              <span
                className={`inline-flex h-2 w-2 rounded-full ${
                  isFetching
                    ? "animate-pulse bg-amber-400"
                    : health?.status === "ok"
                    ? "bg-emerald-400"
                    : "bg-rose-500"
                }`}
              />
              API
            </div>
            <button
              onClick={() => setCreateTicketOpen(true)}
              className="rounded-full border border-surface-subtle bg-surface-muted/80 px-4 py-2 text-sm text-slate-200 hover:border-primary hover:text-white"
            >
              Create Ticket
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500" />
              <div>
                <p className="text-sm font-medium text-white">Avery Stone</p>
                <p className="text-xs text-slate-400">
                  {isAuthenticated ? "Staff" : "Guest"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <Routes>
            <Route
              path="/"
              element={
                <Navigate
                  to={isAuthenticated ? "/overview" : "/staff"}
                  replace
                />
              }
            />
            <Route
              path="/overview"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <TicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/staff" element={<StaffPanelPage />} />
            <Route
              path="*"
              element={
                <div className="grid h-full place-items-center text-center text-slate-400">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Section under construction
                    </h3>
                    <p className="text-sm">
                      The implementation roadmap will fill this view soon.
                    </p>
                  </div>
                </div>
              }
            />
          </Routes>
        </div>
      </main>

      <CreateTicketModal
        isOpen={isCreateTicketOpen}
        onClose={() => setCreateTicketOpen(false)}
      />
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useStaffAuth();

  if (!isAuthenticated) {
    return <Navigate to="/staff" replace />;
  }

  return <>{children}</>;
}
