import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";

import { CreateTicketModal } from "./components/CreateTicketModal";
import { Dashboard } from "./components/Dashboard";
import { useApiHealth } from "./hooks/useApiHealth";
import { AdminTopicsPage } from "./pages/AdminTopicsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { TicketsPage } from "./pages/TicketsPage";

const navigation = [
  { to: "/", label: "Overview" },
  { to: "/tickets", label: "Tickets" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" }
] as const;

export default function App() {
  const { data: health, isFetching } = useApiHealth();
  const [isCreateTicketOpen, setCreateTicketOpen] = useState(false);

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-surface text-slate-100">
      <aside className="hidden flex-col border-r border-surface-subtle bg-surface-muted/40 p-6 lg:flex">
        <div className="mb-8">
          <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
            GameMod
          </span>
          <h1 className="mt-2 text-xl font-semibold text-white">
            Control Center
          </h1>
        </div>
        <nav className="flex flex-col gap-2">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "rounded-xl px-4 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/20 text-white"
                    : "text-slate-400 hover:bg-surface-subtle hover:text-white"
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-surface-subtle bg-surface p-4 text-sm text-slate-400">
          <p className="font-medium text-slate-200">Guild: NovaWatch</p>
          <p className="text-xs">Moderators online: 14</p>
        </div>
      </aside>

      <main className="flex flex-col">
        <header className="flex items-center justify-between border-b border-surface-subtle bg-surface/80 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Tuesday, 9 April
            </p>
            <h2 className="text-lg font-semibold text-white">
              Welcome back, Commander Vega
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
                <p className="text-xs text-slate-400">Admin</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<AdminTopicsPage />} />
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
