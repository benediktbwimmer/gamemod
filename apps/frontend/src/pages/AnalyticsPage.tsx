import { useMemo } from "react";

import { TicketVolumeChart } from "@/components/TicketVolumeChart";
import { useTicketsQuery } from "@/hooks/useTickets";
import { formatRelativeTime } from "@/lib/format";
import { TICKET_STATUS_LABELS, TICKET_STATUSES } from "@/lib/ticketStatus";

export function AnalyticsPage() {
  const ticketsQuery = useTicketsQuery();

  const statusBreakdown = useMemo(() => {
    const counts = Object.fromEntries(
      TICKET_STATUSES.map((status) => [status, 0])
    ) as Record<(typeof TICKET_STATUSES)[number], number>;

    ticketsQuery.data?.tickets.forEach((ticket) => {
      counts[ticket.status] += 1;
    });

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

    return { counts, total };
  }, [ticketsQuery.data?.tickets]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="text-sm text-slate-400">
          Visualize ticket lifecycle trends and workload distribution.
        </p>
      </div>

      <TicketVolumeChart days={30} />

      <section className="rounded-2xl border border-surface-subtle bg-surface/80 p-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Status Distribution
            </h2>
            <p className="text-sm text-slate-400">
              Snapshot of live tickets by workflow state.
            </p>
          </div>
          <span className="rounded-full bg-surface-muted/60 px-3 py-1 text-xs text-slate-300">
            Updated {formatRelativeTime(Date.now())}
          </span>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {TICKET_STATUSES.map((status) => {
            const count = statusBreakdown.counts[status];
            const total = statusBreakdown.total || 1;
            const percentage = Math.round((count / total) * 100);

            return (
              <div
                key={status}
                className="rounded-xl border border-surface-subtle bg-surface-muted/30 p-4 text-sm text-slate-200"
              >
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  {TICKET_STATUS_LABELS[status]}
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-2xl font-semibold text-white">{count}</span>
                  <span className="text-xs text-slate-400">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
