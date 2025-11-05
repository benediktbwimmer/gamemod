import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { NumberValue } from "d3";

type DataPoint = {
  date: string;
  value: number;
};

const mockData: DataPoint[] = [
  { date: "2024-04-01", value: 26 },
  { date: "2024-04-02", value: 18 },
  { date: "2024-04-03", value: 31 },
  { date: "2024-04-04", value: 22 },
  { date: "2024-04-05", value: 28 },
  { date: "2024-04-06", value: 35 },
  { date: "2024-04-07", value: 29 }
];

export function TicketVolumeChart() {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const margin = { top: 16, right: 24, bottom: 24, left: 48 };
    const width = 560;
    const height = 280;

    const dates = mockData.map((d) => new Date(d.date));
    const values = mockData.map((d) => d.value);

    const x = d3
      .scaleTime()
      .domain(d3.extent(dates) as [Date, Date])
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(values)! * 1.1])
      .range([height - margin.bottom, margin.top]);

    const line = d3
      .line<DataPoint>()
      .x((d) => x(new Date(d.date)))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    svg.selectAll("*").remove();

    svg
      .append("path")
      .datum(mockData)
      .attr("fill", "none")
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 3)
      .attr("d", line);

    const formatDate = d3.timeFormat("%b %d");

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(6)
          .tickFormat((domainValue: Date | NumberValue) => {
            const date =
              domainValue instanceof Date
                ? domainValue
                : new Date(domainValue.valueOf());
            return formatDate(date);
          })
      )
      .selectAll("text")
      .attr("fill", "#cbd5f5");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text")
      .attr("fill", "#cbd5f5");

    svg
      .selectAll(".grid-line")
      .data(y.ticks(5))
      .enter()
      .append("line")
      .attr("class", "grid-line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "rgba(99, 102, 241, 0.2)");
  }, []);

  return (
    <div className="rounded-2xl border border-surface-subtle bg-surface/60 p-6 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Ticket Volume (7d)
          </h2>
          <p className="text-sm text-slate-400">
            Rolling total of user-submitted requests
          </p>
        </div>
        <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary-foreground">
          +12% WoW
        </span>
      </div>
      <svg ref={svgRef} className="w-full" role="img" aria-label="Ticket volume trend" />
    </div>
  );
}
