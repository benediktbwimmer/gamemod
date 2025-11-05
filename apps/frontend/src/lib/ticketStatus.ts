import type { TicketStatus } from "./types";

export const TICKET_STATUSES: TicketStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed"
];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed"
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open: "#6366f1",
  in_progress: "#f59e0b",
  resolved: "#10b981",
  closed: "#8b5cf6"
};
