import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";

import { useTicketStatusSeries } from "@/hooks/useTicketAnalytics";
import { TICKET_STATUS_COLORS, TICKET_STATUS_LABELS } from "@/lib/ticketStatus";

type TicketVolumeChartProps = {
  days?: number;
};

export function TicketVolumeChart({ days = 14 }: TicketVolumeChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { data, isLoading, isError, error } = useTicketStatusSeries(days);

  const lines = useMemo(() => {
    if (!data?.series.length || !data.statuses.length) {
      return [];
    }

    return data.statuses.map((status) => ({
      status,
      values: data.series.map((point) => ({
        date: new Date(point.date),
        value: point.statuses[status] ?? 0
      }))
    }));
  }, [data]);

  const totalTickets = useMemo(() => {
    if (!data?.series.length) {
      return 0;
    }

    return data.series.reduce((acc, point) => {
      return (
        acc +
        Object.values(point.statuses).reduce((sum, value) => sum + value, 0)
      );
    }, 0);
  }, [data]);

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 560 280`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    svg.selectAll("*").remove();

    if (lines.length === 0) {
      return;
    }

    const margin = { top: 24, right: 32, bottom: 32, left: 56 };
    const width = 560;
    const height = 280;

    const allDates = lines[0]?.values.map((value) => value.date) ?? [];
    const dateExtent = d3.extent(allDates) as [Date, Date];

    const flatValues = lines.flatMap((line) => line.values.map((v) => v.value));
    const maxValue = Math.max(1, d3.max(flatValues) ?? 0);

    const x = d3
      .scaleTime()
      .domain(dateExtent)
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([0, maxValue * 1.15])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const formatDate = d3.timeFormat("%b %d");

    const xAxis = d3
      .axisBottom<Date>(x)
      .ticks(6)
      .tickFormat((value) => formatDate(value));

    svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "#cbd5f5");

    const yAxis = d3.axisLeft(y).ticks(5).tickFormat((value) => `${value}`);

    svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis)
      .selectAll("text")
      .attr("fill", "#cbd5f5");

    svg
      .append("g")
      .attr("class", "grid-lines")
      .selectAll("line")
      .data(y.ticks(5))
      .join("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "rgba(148, 163, 184, 0.15)");

    const lineGenerator = d3
      .line<{ date: Date; value: number }>()
      .x((d) => x(d.date))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    lines.forEach((line) => {
      svg
        .append("path")
        .datum(line.values)
        .attr("fill", "none")
        .attr("stroke", TICKET_STATUS_COLORS[line.status] ?? "#6366f1")
        .attr("stroke-width", 2.5)
        .attr("d", lineGenerator);
    });
  }, [lines]);

  return (
    <div className="rounded-2xl border border-surface-subtle bg-surface/60 p-6 backdrop-blur">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Ticket Volume by Status ({days}d)
          </h2>
          <p className="text-sm text-slate-400">
            Rolling trend across ticket lifecycle states
          </p>
        </div>
        <div className="rounded-full bg-primary/10 px-4 py-1 text-xs font-medium text-slate-200">
          {totalTickets} tickets tracked
        </div>
      </div>

      {isLoading ? (
        <div className="grid h-[240px] place-items-center text-sm text-slate-400">
          Loading chart…
        </div>
      ) : isError ? (
        <div className="grid h-[240px] place-items-center text-center text-sm text-rose-300">
          <p>Unable to load analytics.</p>
          <p className="text-xs opacity-70">{String(error)}</p>
        </div>
      ) : lines.length === 0 ? (
        <div className="grid h-[240px] place-items-center text-sm text-slate-400">
          No ticket activity in this window.
        </div>
      ) : (
        <>
          <svg
            ref={svgRef}
            className="w-full"
            role="img"
            aria-label="Ticket status trend lines"
          />

          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data?.statuses.map((status) => {
              const lineData = lines.find((line) => line.status === status);
              const latestSeriesEntry =
                data.series.length > 0
                  ? data.series[data.series.length - 1]
                  : undefined;
              const fallbackLineValue =
                lineData && lineData.values.length > 0
                  ? lineData.values[lineData.values.length - 1]?.value ?? 0
                  : 0;
              const latest =
                latestSeriesEntry?.statuses[status] ?? fallbackLineValue;

              return (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-xl border border-surface-subtle/50 bg-surface-muted/30 px-3 py-2 text-xs text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: TICKET_STATUS_COLORS[status] ?? "#6366f1" }}
                    />
                    <span className="font-medium text-slate-100">
                      {TICKET_STATUS_LABELS[status] ?? status}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-100">
                    {latest}
                  </span>
                </div>
              );
            })}
          </dl>
        </>
      )}
    </div>
  );
}
