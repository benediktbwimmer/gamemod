import { useState } from "react";

import { useTicketsQuery, useUpdateTicketMutation } from "@/hooks/useTickets";
import { useTopicsQuery } from "@/hooks/useTopics";
import { formatRelativeTime, formatTimestamp } from "@/lib/format";
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_STATUSES
} from "@/lib/ticketStatus";
import { TicketDetailDrawer } from "@/components/TicketDetailDrawer";

export function TicketsPage() {
  const ticketsQuery = useTicketsQuery();
  const topicsQuery = useTopicsQuery();
  const updateTicket = useUpdateTicketMutation();

  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const tickets = ticketsQuery.data?.tickets ?? [];
  const activeTickets = tickets.filter((ticket) => ticket.status !== "closed");
  const closedTickets = tickets.filter((ticket) => ticket.status === "closed");
  const topics = topicsQuery.data?.topics ?? [];

  const handleStatusChange = (ticketId: string, status: string) => {
    if (!TICKET_STATUSES.includes(status as (typeof TICKET_STATUSES)[number])) {
      return;
    }

    const nextStatus = status as (typeof TICKET_STATUSES)[number];

    setErrorMessage(null);
    setActiveTicketId(ticketId);

    updateTicket.mutate(
      { id: ticketId, status: nextStatus },
      {
        onError: (error) => {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to update ticket status."
          );
        },
        onSettled: () => {
          setActiveTicketId(null);
        }
      }
    );
  };

  const handleTopicChange = (ticketId: string, topicId: string) => {
    if (!topicId) {
      return;
    }

    setErrorMessage(null);
    setActiveTicketId(ticketId);

    updateTicket.mutate(
      { id: ticketId, topicId },
      {
        onError: (error) => {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to update ticket topic."
          );
        },
        onSettled: () => {
          setActiveTicketId(null);
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Ticket Queue</h1>
        <p className="text-sm text-slate-400">
          Review live tickets, adjust status, and re-route as needed.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-surface-subtle bg-surface/80">
        <div className="flex items-center justify-between border-b border-surface-subtle px-4 py-3 text-xs uppercase tracking-widest text-slate-400">
          <span>{activeTickets.length} Active Tickets</span>
          <span>Last updated {formatRelativeTime(Date.now())}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-subtle text-sm">
            <thead className="bg-surface-muted/40 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Ticket
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Player
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Topic
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Created
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Updated
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-subtle text-slate-200">
              {ticketsQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    Loading tickets…
                  </td>
                </tr>
              ) : activeTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    All active tickets are cleared. New requests will appear here.
                  </td>
                </tr>
              ) : (
                activeTickets.map((ticket) => {
                  const isUpdating =
                    updateTicket.isPending && activeTicketId === ticket.id;
                  const topicInList = ticket.topic
                    ? topics.some((topic) => topic.id === ticket.topic?.id)
                    : false;

                  return (
                    <tr key={ticket.id} className="hover:bg-surface-muted/30">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-white">{ticket.title}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {ticket.body.slice(0, 120)}
                          {ticket.body.length > 120 ? "…" : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-200">{ticket.playerId}</div>
                        {ticket.organizationId ? (
                          <div className="text-xs text-slate-400">
                            Org: {ticket.organizationId}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <select
                          className="w-full rounded-lg border border-surface-subtle bg-surface-muted/40 px-2 py-1 text-xs text-white outline-none focus:border-primary"
                          value={ticket.topic?.id ?? ""}
                          onChange={(event) => {
                            const nextTopic = event.target.value;
                            if (!nextTopic || nextTopic === ticket.topic?.id) {
                              return;
                            }
                            handleTopicChange(ticket.id, nextTopic);
                          }}
                          disabled={
                            topicsQuery.isLoading ||
                            topicsQuery.error !== null ||
                            isUpdating
                          }
                        >
                          <option value="" disabled>
                            {topicsQuery.isLoading
                              ? "Loading topics…"
                              : "Select topic"}
                          </option>
                          {!topicInList && ticket.topic ? (
                            <option value={ticket.topic.id}>
                              {ticket.topic.name} (archived)
                            </option>
                          ) : null}
                          {topics.map((topic) => (
                            <option key={topic.id} value={topic.id}>
                              {topic.name}
                            </option>
                          ))}
                        </select>
                        {topicsQuery.error ? (
                          <p className="mt-1 text-xs text-rose-300">
                            Unable to load topics.
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: TICKET_STATUS_COLORS[ticket.status]
                            }}
                          />
                          <select
                            className="rounded-lg border border-surface-subtle bg-surface-muted/40 px-2 py-1 text-xs text-white outline-none focus:border-primary"
                            value={ticket.status}
                            onChange={(event) => {
                              const nextStatus = event.target.value;
                              if (nextStatus === ticket.status) {
                                return;
                              }
                              handleStatusChange(ticket.id, nextStatus);
                            }}
                            disabled={isUpdating}
                          >
                            {TICKET_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {TICKET_STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-400">
                        <div>{formatTimestamp(ticket.createdAt)}</div>
                        <div>{formatRelativeTime(ticket.createdAt)} ago</div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-slate-400">
                        <div>{formatTimestamp(ticket.updatedAt)}</div>
                        <div>{formatRelativeTime(ticket.updatedAt)} ago</div>
                      </td>
                      <td className="px-4 py-3 align-top text-right text-xs text-slate-400">
                        <button
                          type="button"
                          onClick={() => setSelectedTicketId(ticket.id)}
                          className="rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-1 text-xs text-slate-200 hover:border-primary hover:text-white"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {closedTickets.length > 0 ? (
        <div className="rounded-2xl border border-surface-subtle bg-surface/80">
          <div className="flex items-center justify-between border-b border-surface-subtle px-4 py-3 text-xs uppercase tracking-widest text-slate-400">
            <span>{closedTickets.length} Closed Tickets</span>
            <span>Updated {formatRelativeTime(Date.now())}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-subtle text-sm">
              <thead className="bg-surface-muted/40 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Ticket
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Player
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Topic
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Closed At
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-subtle text-slate-200">
                {closedTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-surface-muted/20">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-white">{ticket.title}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {ticket.body.slice(0, 100)}
                        {ticket.body.length > 100 ? "…" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-200">
                      <div className="font-medium">{ticket.playerId}</div>
                      {ticket.organizationId ? (
                        <div className="text-xs text-slate-400">
                          Org: {ticket.organizationId}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-400">
                      {ticket.topic?.name ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-400">
                      <div>{formatTimestamp(ticket.updatedAt)}</div>
                      <div>{formatRelativeTime(ticket.updatedAt)} ago</div>
                    </td>
                    <td className="px-4 py-3 align-top text-right text-xs text-slate-400">
                      <button
                        type="button"
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className="rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-1 text-xs text-slate-200 hover:border-primary hover:text-white"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <TicketDetailDrawer
        ticketId={selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
      />
    </div>
  );
}
