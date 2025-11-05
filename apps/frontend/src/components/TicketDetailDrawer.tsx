import { useEffect, useMemo, useState } from "react";

import {
  useCreateTicketMessageMutation,
  useTicketMessagesQuery,
  useTicketQuery,
  useUpdateTicketMutation
} from "@/hooks/useTickets";
import { formatRelativeTime, formatTimestamp } from "@/lib/format";
import {
  TICKET_STATUS_COLORS,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES
} from "@/lib/ticketStatus";

type TicketDetailDrawerProps = {
  ticketId: string | null;
  onClose: () => void;
};

export function TicketDetailDrawer({ ticketId, onClose }: TicketDetailDrawerProps) {
  const [messageBody, setMessageBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const ticketQuery = useTicketQuery(ticketId);
  const messagesQuery = useTicketMessagesQuery(ticketId);
  const createMessage = useCreateTicketMessageMutation();
  const updateTicket = useUpdateTicketMutation();

  useEffect(() => {
    if (!ticketId) {
      setMessageBody("");
      setFormError(null);
      createMessage.reset();
    }
  }, [createMessage, ticketId]);

  const ticket = ticketQuery.data?.ticket;
  const statusColor = ticket
    ? TICKET_STATUS_COLORS[ticket.status] ?? "#6366f1"
    : "#6366f1";

  const isClosed = ticket?.status === "closed";

  const statusOptions = useMemo(() => TICKET_STATUSES, []);

  const handleSubmit = () => {
    if (!ticketId) {
      return;
    }

    if (!messageBody.trim()) {
      setFormError("Message cannot be empty");
      return;
    }

    setFormError(null);

    createMessage.mutate(
      {
        ticketId,
        body: messageBody.trim(),
        authorType: "agent"
      },
      {
        onSuccess: () => {
          setMessageBody("");
        },
        onError: (error) => {
          setFormError(
            error instanceof Error ? error.message : "Failed to send message"
          );
        }
      }
    );
  };

  const handleCloseTicket = () => {
    if (!ticketId || isClosed) {
      return;
    }

    updateTicket.mutate(
      { id: ticketId, status: "closed" },
      {
        onError: (error) => {
          setFormError(
            error instanceof Error ? error.message : "Failed to close ticket"
          );
        }
      }
    );
  };

  const handleStatusChange = (status: string) => {
    if (
      !ticketId ||
      !statusOptions.includes(status as (typeof statusOptions)[number])
    ) {
      return;
    }

    updateTicket.mutate(
      { id: ticketId, status: status as (typeof statusOptions)[number] },
      {
        onError: (error) => {
          setFormError(
            error instanceof Error ? error.message : "Failed to update ticket"
          );
        }
      }
    );
  };

  if (!ticketId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={onClose} aria-hidden />
      <aside className="relative flex h-full w-full max-w-2xl flex-col border-l border-surface-subtle bg-surface">
        <header className="flex items-center justify-between border-b border-surface-subtle px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Ticket</p>
            {ticket ? (
              <h2 className="text-lg font-semibold text-white">{ticket.title}</h2>
            ) : (
              <div className="h-5 w-40 animate-pulse rounded bg-surface-muted" />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-surface-subtle bg-surface-muted/60 px-3 py-1 text-xs text-slate-300 hover:text-white"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {ticket ? (
                <section className="rounded-xl border border-surface-subtle bg-surface-muted/30 p-4 text-sm text-slate-200">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                      style={{
                        color: statusColor,
                        borderColor: statusColor
                      }}
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: statusColor }}
                      />
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </span>
                    <select
                      className="rounded-lg border border-surface-subtle bg-surface px-3 py-1 text-xs text-white outline-none focus:border-primary"
                      value={ticket.status}
                      onChange={(event) => handleStatusChange(event.target.value)}
                    >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {TICKET_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleCloseTicket}
                  disabled={isClosed || updateTicket.isPending}
                  className="ml-auto rounded-lg border border-surface-subtle bg-surface-muted px-3 py-1 text-xs text-slate-200 hover:border-rose-400 hover:text-white disabled:opacity-50"
                >
                  {isClosed ? "Ticket Closed" : "Close Ticket"}
                </button>
              </div>
              <dl className="mt-3 grid gap-3 text-xs text-slate-400">
                <div className="flex justify-between gap-2">
                  <dt>Player</dt>
                  <dd className="text-slate-200">{ticket.playerId}</dd>
                </div>
                {ticket.organizationId ? (
                  <div className="flex justify-between gap-2">
                    <dt>Organization</dt>
                    <dd className="text-slate-200">{ticket.organizationId}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-2">
                  <dt>Topic</dt>
                  <dd className="text-slate-200">{ticket.topic?.name ?? "Unassigned"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Created</dt>
                  <dd>
                    {formatTimestamp(ticket.createdAt)} • {formatRelativeTime(ticket.createdAt)} ago
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Updated</dt>
                  <dd>
                    {formatTimestamp(ticket.updatedAt)} • {formatRelativeTime(ticket.updatedAt)} ago
                  </dd>
                </div>
              </dl>
                  <p className="mt-4 rounded-lg border border-surface-subtle bg-surface px-3 py-3 text-sm text-slate-200">
                    {ticket.body}
                  </p>
                </section>
          ) : (
            <div className="h-48 animate-pulse rounded-xl border border-surface-subtle bg-surface-muted/20" />
          )}

          <section className="rounded-xl border border-surface-subtle bg-surface-muted/30 p-4">
            <h3 className="text-sm font-semibold text-white">Conversation</h3>
            <div className="mt-3 space-y-4 text-sm">
              {messagesQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-lg border border-surface-subtle/40 bg-surface-muted/20" />
                  ))}
                </div>
              ) : messagesQuery.data?.messages.length ? (
                messagesQuery.data.messages.map((message) => (
                  <article
                    key={message.id}
                    className={`rounded-lg border px-3 py-2 ${
                      message.authorType === "agent"
                        ? "border-primary/40 bg-primary/10"
                        : "border-amber-500/40 bg-amber-500/10"
                    }`}
                  >
                    <header className="flex items-center justify-between text-xs text-slate-300">
                      <span className="uppercase tracking-wide">
                        {message.authorType === "agent" ? "Support" : "Player"}
                      </span>
                      <span>{formatTimestamp(message.createdAt)}</span>
                    </header>
                    <p className="mt-2 whitespace-pre-wrap text-slate-100">{message.body}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-surface-subtle/50 bg-surface px-3 py-4 text-xs text-slate-400">
                  No messages yet. Start the conversation below.
                </p>
              )}
            </div>
          </section>
        </div>

        <footer className="border-t border-surface-subtle px-5 py-4">
          {formError ? (
            <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {formError}
            </div>
          ) : null}
          <div className="flex flex-col gap-3">
            <textarea
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              placeholder="Type your reply to the player"
              rows={3}
              className="w-full rounded-lg border border-surface-subtle bg-surface px-3 py-2 text-sm text-white outline-none focus:border-primary"
              disabled={!ticketId || createMessage.isPending}
            />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Replies post as <strong className="text-slate-200">Support</strong>
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-surface-subtle bg-surface-muted/60 px-4 py-2 text-sm text-slate-200 hover:text-white"
                >
                  Back to list
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createMessage.isPending || !ticketId}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {createMessage.isPending ? "Sending…" : "Send Reply"}
                </button>
              </div>
            </div>
          </div>
        </footer>
      </aside>
    </div>
  );
}
