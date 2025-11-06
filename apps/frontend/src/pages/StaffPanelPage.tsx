import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { AdminSiteCustomizer } from "@/components/AdminSiteCustomizer";
import { AdminThemeDesigner } from "@/components/AdminThemeDesigner";
import { useStaffSettingsQuery } from "@/hooks/useStaffSettings";
import { useCreateTopicMutation, useTopicsQuery } from "@/hooks/useTopics";
import { formatTimestamp } from "@/lib/format";
import { useStaffAuth } from "@/lib/staffAuth";
import { defaultStaffSiteSettings } from "@/lib/staffSettings";

const STAFF_USERS = [
  {
    username: "SquishyFoxy",
    password: "1337",
    adminKey: "1337"
  },
  {
    username: "Mod1337",
    password: "1337",
    adminKey: "1337"
  }
] as const;

export function StaffPanelPage() {
  const topicsQuery = useTopicsQuery();
  const createTopic = useCreateTopicMutation();
  const { data: staffSettings } = useStaffSettingsQuery();
  const { isAuthenticated, adminKey, login, logout } = useStaffAuth();

  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  const siteSettings = staffSettings?.site ?? defaultStaffSiteSettings;

  const handleUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = usernameInput.trim();
    const password = passwordInput.trim();

    if (!username || !password) {
      setErrorMessage("Enter both username and password.");
      return;
    }

    const matchingUser = STAFF_USERS.find(
      (user) => user.username === username && user.password === password
    );

    if (!matchingUser) {
      setErrorMessage("Invalid credentials.");
      setPasswordInput("");
      return;
    }

    login({ username: matchingUser.username, adminKey: matchingUser.adminKey });

    setUsernameInput("");
    setPasswordInput("");
    setErrorMessage(null);
    // Stay on the staff panel after unlocking to continue working with tools.
  };

  const handleCreateTopic = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adminKey) {
      setErrorMessage("Staff credentials required.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Topic name is required.");
      return;
    }

    setErrorMessage(null);

    createTopic.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        adminKey
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
        },
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to create topic. Check your credentials.";

          setErrorMessage(message);

          if (error instanceof Error && /401|unauthorized/i.test(error.message)) {
            logout();
            navigate("/staff", { replace: true });
          }
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Staff Panel</h1>
        <p className="text-sm text-slate-400">
          Authenticate to access moderation dashboards, design controls, and ticket tooling.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-surface-subtle bg-surface/80 p-6">
        <h2 className="text-lg font-semibold text-white">Staff Login</h2>
        <p className="text-sm text-slate-400">
          Sign in with approved credentials to unlock the control surface.
        </p>

        {isAuthenticated ? (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Staff tools unlocked.
            <button
              type="button"
              onClick={() => {
                logout();
                setErrorMessage(null);
              }}
              className="rounded-lg border border-emerald-400/40 px-3 py-1 text-xs font-medium text-emerald-100 hover:border-emerald-200 hover:text-white"
            >
              Lock
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleUnlock}
            className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <input
              type="text"
              value={usernameInput}
              onChange={(event) => setUsernameInput(event.target.value)}
              className="w-full rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
              placeholder="Username"
              autoComplete="username"
            />
            <input
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              className="w-full rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
              placeholder="Password"
              autoComplete="current-password"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Unlock
            </button>
          </form>
        )}
      </section>

      {isAuthenticated ? (
        <>
          <div className="space-y-6">
            <AdminThemeDesigner />
            <AdminSiteCustomizer />
          </div>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-surface-subtle bg-surface/80 p-6">
              <h2 className="text-lg font-semibold text-white">Create Topic</h2>
              <p className="text-sm text-slate-400">
                Make quick adjustments as your moderation queues evolve.
              </p>

              <form onSubmit={handleCreateTopic} className="mt-4 space-y-4">
                <label className="block text-sm">
                  <span className="text-slate-300">Topic name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                    placeholder="e.g. Billing or Matchmaking"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-slate-300">Description</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                    placeholder="Short summary of when to use this topic"
                  />
                </label>

                <button
                  type="submit"
                  disabled={createTopic.isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {createTopic.isPending ? "Saving…" : "Save Topic"}
                </button>

                {createTopic.isSuccess ? (
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    Topic created successfully.
                  </div>
                ) : null}
              </form>
            </div>

            {siteSettings.showTopicsPanel ? (
              <div className="rounded-2xl border border-surface-subtle bg-surface/80 p-6">
                <h2 className="text-lg font-semibold text-white">Existing Topics</h2>
                <p className="text-sm text-slate-400">
                  These are visible to players when they submit new tickets.
                </p>

                <div className="mt-4 space-y-3">
                  {topicsQuery.isLoading ? (
                    <div className="h-24 animate-pulse rounded-xl border border-surface-muted/40 bg-surface-muted/20" />
                  ) : topicsQuery.error ? (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                      Unable to load topics.
                    </div>
                  ) : topicsQuery.data?.topics.length ? (
                    topicsQuery.data.topics.map((topic) => (
                      <div
                        key={topic.id}
                        className="rounded-xl border border-surface-muted/40 bg-surface-muted/30 px-4 py-3 text-sm text-slate-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">{topic.name}</span>
                          <span className="text-xs text-slate-400">
                            {formatTimestamp(topic.updatedAt)}
                          </span>
                        </div>
                        {topic.description ? (
                          <p className="mt-1 text-xs text-slate-400">
                            {topic.description}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-surface-muted/40 bg-surface-muted/30 px-4 py-3 text-sm text-slate-300">
                      No topics yet. Create one to enable ticket routing.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-surface-subtle bg-surface/60 p-10 text-center text-slate-400">
          <h3 className="text-lg font-semibold text-white">
            Staff tools are locked
          </h3>
          <p className="mt-2 text-sm">
            Provide the staff credentials above to reveal theme controls and topic
            management. Overview, Tickets, and Analytics become available via the sidebar
            once authenticated.
          </p>
        </section>
      )}
    </div>
  );
}
