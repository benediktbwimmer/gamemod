import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { TicketAnalyticsSeriesPoint, TicketStatus } from "@/lib/types";

type TicketStatusSeriesResponse = {
  statuses: TicketStatus[];
  series: TicketAnalyticsSeriesPoint[];
};

export function useTicketStatusSeries(days = 7) {
  return useQuery({
    queryKey: ["ticketStatusSeries", days],
    queryFn: (): Promise<TicketStatusSeriesResponse> =>
      apiFetch<TicketStatusSeriesResponse>(
        `/v1/tickets/analytics/status?days=${encodeURIComponent(days)}`
      ),
    refetchInterval: 60_000
  });
}
