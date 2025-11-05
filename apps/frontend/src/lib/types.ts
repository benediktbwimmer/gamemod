export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type Topic = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Ticket = {
  id: string;
  organizationId: string | null;
  title: string;
  body: string;
  playerId: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  topic: {
    id: string;
    name: string;
  } | null;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  authorType: "agent" | "player";
  body: string;
  createdAt: string;
};

export type TicketAnalyticsSeriesPoint = {
  date: string;
  statuses: Record<TicketStatus, number>;
};
