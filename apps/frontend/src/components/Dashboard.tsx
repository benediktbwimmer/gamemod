import { useMemo } from "react";

import { useTicketsQuery } from "@/hooks/useTickets";
import { formatRelativeTime } from "@/lib/format";
import { TICKET_STATUS_LABELS, TICKET_STATUSES } from "@/lib/ticketStatus";

import { StatCard } from "./StatCard";
import { TicketVolumeChart } from "./TicketVolumeChart";

function deriveQueue(tickets: ReturnType<typeof useTicketsQuery>["data"]): Array<{
  id: string;
  player: string;
  topic: string;
  wait: string;
  priority: "Critical" | "High" | "Normal";
}> {
  const pending =
    tickets?.tickets
      .filter((ticket) => ticket.status === "open" || ticket.status === "in_progress")
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ) ?? [];

  return pending.slice(0, 4).map((ticket) => {
    const waitLabel = formatRelativeTime(ticket.createdAt);
    const minutesOpen =
      (Date.now() - new Date(ticket.createdAt).getTime()) / 60000;

    let priority: "Critical" | "High" | "Normal" = "Normal";
    if (minutesOpen >= 180) {
      priority = "Critical";
    } else if (minutesOpen >= 60) {
      priority = "High";
    }

    return {
      id: ticket.id.slice(0, 8).toUpperCase(),
      player: ticket.playerId,
      topic: ticket.topic?.name ?? "Unassigned",
      wait: waitLabel,
      priority
    };
  });
}

export function Dashboard() {
  const ticketsQuery = useTicketsQuery();

  const statusCards = useMemo(() => {
    const counts = Object.fromEntries(
      TICKET_STATUSES.map((status) => [status, 0])
    ) as Record<(typeof TICKET_STATUSES)[number], number>;

    ticketsQuery.data?.tickets.forEach((ticket) => {
      counts[ticket.status] += 1;
    });

    return TICKET_STATUSES.map((status) => ({
      status,
      label: `${TICKET_STATUS_LABELS[status]}${
        status === "open" ? " Tickets" : ""
      }`,
      value: counts[status].toString()
    }));
  }, [ticketsQuery.data?.tickets]);

  const queuePreview = useMemo(
    () => deriveQueue(ticketsQuery.data),
    [ticketsQuery.data]
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ticketsQuery.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl border border-surface-subtle bg-surface/40"
              />
            ))
          : statusCards.map((stat) => (
              <StatCard
                key={stat.status}
                label={stat.label}
                value={stat.value}
              />
            ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <TicketVolumeChart />

        <div className="rounded-2xl border border-surface-subtle bg-surface/80 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Queue Preview</h2>
          <p className="mb-4 text-sm text-slate-400">
            Monitor the oldest live tickets still awaiting resolution.
          </p>
          {ticketsQuery.isLoading ? (
            <ul className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <li
                  key={index}
                  className="h-20 animate-pulse rounded-xl border border-surface-muted/40 bg-surface-muted/20"
                />
              ))}
            </ul>
          ) : queuePreview.length === 0 ? (
            <div className="grid h-32 place-items-center text-sm text-slate-400">
              No active tickets in the queue.
            </div>
          ) : (
            <ul className="space-y-3">
              {queuePreview.map((ticket) => (
                <li
                  key={ticket.id}
                  className="rounded-xl border border-surface-muted/40 bg-surface-muted/40 p-4"
                >
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span className="font-medium text-white">{ticket.id}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        ticket.priority === "Critical"
                          ? "bg-rose-500/20 text-rose-200"
                          : ticket.priority === "High"
                          ? "bg-amber-500/20 text-amber-200"
                          : "bg-slate-500/20 text-slate-200"
                      }`}
                    >
                      {ticket.priority}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs uppercase text-slate-400">
                    <span>{ticket.player}</span>
                    <span>{ticket.topic}</span>
                    <span>{ticket.wait}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-6">
        {ticketsQuery.error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            Failed to load tickets: {String(ticketsQuery.error)}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {ticketsQuery.data?.tickets && ticketsQuery.data.tickets.length === 0 ? (
          <div className="rounded-2xl border border-surface-subtle bg-surface/60 p-4 text-sm text-slate-400">
            Start by creating your first ticket to populate analytics.
          </div>
        ) : null}
      </section>
    </div>
  );
}
