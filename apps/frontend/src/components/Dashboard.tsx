import { TicketVolumeChart } from "./TicketVolumeChart";
import { StatCard } from "./StatCard";

const statSummary = [
  { label: "Open Tickets", value: "128", delta: { value: "8%", trend: "up" } },
  {
    label: "First Response SLA",
    value: "92%",
    delta: { value: "4%", trend: "down" }
  },
  { label: "Active Moderators", value: "14", delta: { value: "2", trend: "up" } },
  { label: "Escalations", value: "6", delta: { value: "1", trend: "down" } }
] as const;

const queuePreview = [
  {
    id: "GM-1024",
    player: "LunarFox",
    category: "Account",
    wait: "12m",
    priority: "High"
  },
  {
    id: "GM-1023",
    player: "RogueSplash",
    category: "Exploit Report",
    wait: "27m",
    priority: "Critical"
  },
  {
    id: "GM-1022",
    player: "MysticAri",
    category: "Moderation",
    wait: "42m",
    priority: "Medium"
  }
] as const;

export function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statSummary.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            delta={stat.delta}
          />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <TicketVolumeChart />

        <div className="rounded-2xl border border-surface-subtle bg-surface/80 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Queue Preview</h2>
          <p className="mb-4 text-sm text-slate-400">
            Focus on oldest tickets in each queue to maintain SLA.
          </p>
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
                  <span>{ticket.category}</span>
                  <span>{ticket.wait} wait</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
