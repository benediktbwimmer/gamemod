import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { useCreateTicketMutation } from "@/hooks/useTickets";
import { useTopicsQuery } from "@/hooks/useTopics";

type CreateTicketModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CreateTicketModal({ isOpen, onClose }: CreateTicketModalProps) {
  const topicsQuery = useTopicsQuery();
  const createTicket = useCreateTicketMutation();

  const [title, setTitle] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [body, setBody] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setPlayerId("");
      setTopicId("");
      setBody("");
      setOrganizationId("");
      setFormError(null);
      createTicket.reset();
    }
  }, [createTicket, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !playerId.trim() || !topicId || !body.trim()) {
      setFormError("Please fill in all required fields.");
      return;
    }

    setFormError(null);

    createTicket.mutate(
      {
        title: title.trim(),
        playerId: playerId.trim(),
        topicId,
        body: body.trim(),
        organizationId: organizationId.trim() || undefined
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          setFormError(error instanceof Error ? error.message : "Failed to create ticket");
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-surface-subtle bg-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Create Ticket</h2>
            <p className="text-sm text-slate-400">
              Capture player context and route to the correct topic.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-surface-subtle bg-surface-muted/50 px-3 py-1 text-xs text-slate-300 hover:text-white"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="text-slate-300">Title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
              placeholder="Brief summary of the issue"
              required
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-300">Player ID</span>
              <input
                type="text"
                value={playerId}
                onChange={(event) => setPlayerId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                placeholder="Player handle or unique ID"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="text-slate-300">Organization (optional)</span>
              <input
                type="text"
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
                placeholder="Guild / org identifier"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-slate-300">Topic</span>
            <select
              value={topicId}
              onChange={(event) => setTopicId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
              required
              disabled={topicsQuery.isLoading || topicsQuery.error !== null}
            >
              <option value="">Select a topic…</option>
              {topicsQuery.data?.topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
            {topicsQuery.isLoading ? (
              <p className="mt-1 text-xs text-slate-400">Loading available topics…</p>
            ) : null}
            {topicsQuery.error ? (
              <p className="mt-1 text-xs text-rose-300">
                Failed to load topics: {String(topicsQuery.error)}
              </p>
            ) : null}
            {topicsQuery.data && topicsQuery.data.topics.length === 0 ? (
              <p className="mt-1 text-xs text-amber-200">
                No topics available yet. Ask an admin to add one in Settings.
              </p>
            ) : null}
          </label>

          <label className="block text-sm">
            <span className="text-slate-300">Details</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
              placeholder="Add reproduction steps, attachments, or player notes"
              required
            />
          </label>

          {formError ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {formError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-surface-subtle bg-surface-muted/50 px-4 py-2 text-sm text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTicket.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {createTicket.isPending ? "Creating…" : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
