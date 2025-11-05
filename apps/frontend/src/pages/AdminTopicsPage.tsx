import { useState } from "react";
import type { FormEvent } from "react";

import { useCreateTopicMutation, useTopicsQuery } from "@/hooks/useTopics";
import { formatTimestamp } from "@/lib/format";

export function AdminTopicsPage() {
  const topicsQuery = useTopicsQuery();
  const createTopic = useCreateTopicMutation();

  const [passwordInput, setPasswordInput] = useState("");
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isUnlocked = Boolean(adminKey);

  const handleUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordInput.trim()) {
      setErrorMessage("Enter the admin password to continue.");
      return;
    }
    setAdminKey(passwordInput.trim());
    setPasswordInput("");
    setErrorMessage(null);
  };

  const handleCreateTopic = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adminKey) {
      setErrorMessage("Admin password required.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Topic name is required.");
      return;
    }

    setErrorMessage(null);

    createTopic.mutate(
      { name: name.trim(), description: description.trim() || undefined, adminKey },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
        },
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to create topic. Check your password.";

          setErrorMessage(message);

          if (
            error instanceof Error &&
            /401|unauthorized/i.test(error.message)
          ) {
            setAdminKey(null);
          }
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Topic Settings</h1>
        <p className="text-sm text-slate-400">
          Securely manage help topics available to ticket creators.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border border-surface-subtle bg-surface/80 p-6">
        <h2 className="text-lg font-semibold text-white">Admin Access</h2>
        <p className="text-sm text-slate-400">
          Enter the shared password to unlock topic management.
        </p>

        {isUnlocked ? (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Admin controls unlocked.
            <button
              type="button"
              onClick={() => setAdminKey(null)}
              className="rounded-lg border border-emerald-400/40 px-3 py-1 text-xs font-medium text-emerald-100 hover:border-emerald-200 hover:text-white"
            >
              Lock
            </button>
          </div>
        ) : (
          <form onSubmit={handleUnlock} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              className="w-full rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
              placeholder="Admin password"
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

      <section className="grid gap-6 lg:grid-cols-[1fr,1fr]">
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
                disabled={!isUnlocked}
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
                disabled={!isUnlocked}
              />
            </label>

            <button
              type="submit"
              disabled={!isUnlocked || createTopic.isPending}
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
      </section>
    </div>
  );
}
