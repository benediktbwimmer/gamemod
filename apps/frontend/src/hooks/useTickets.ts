import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { Ticket, TicketMessage, TicketStatus } from "@/lib/types";

type TicketsResponse = {
  tickets: Ticket[];
};

type TicketResponse = {
  ticket: Ticket;
};

type TicketMessagesResponse = {
  messages: TicketMessage[];
};

type CreateTicketInput = {
  title: string;
  body: string;
  playerId: string;
  topicId: string;
  organizationId?: string | null;
};

type UpdateTicketInput = {
  id: string;
  title?: string;
  body?: string;
  status?: TicketStatus;
  topicId?: string;
  organizationId?: string | null;
};

export function useTicketsQuery() {
  return useQuery({
    queryKey: ["tickets"],
    queryFn: (): Promise<TicketsResponse> => apiFetch<TicketsResponse>("/v1/tickets")
  });
}

export function useTicketQuery(ticketId?: string | null) {
  return useQuery({
    queryKey: ["ticket", ticketId],
    enabled: Boolean(ticketId),
    queryFn: (): Promise<TicketResponse> =>
      apiFetch<TicketResponse>(`/v1/tickets/${ticketId}`)
  });
}

export function useTicketMessagesQuery(ticketId?: string | null) {
  return useQuery({
    queryKey: ["ticketMessages", ticketId],
    enabled: Boolean(ticketId),
    queryFn: (): Promise<TicketMessagesResponse> =>
      apiFetch<TicketMessagesResponse>(`/v1/tickets/${ticketId}/messages`),
    refetchInterval: 30_000
  });
}

export function useCreateTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTicketInput): Promise<TicketResponse> =>
      apiFetch<TicketResponse>("/v1/tickets", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticketStatusSeries"] });
    }
  });
}

export function useUpdateTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTicketInput): Promise<TicketResponse> =>
      apiFetch<TicketResponse>(`/v1/tickets/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: input.title,
          body: input.body,
          status: input.status,
          topicId: input.topicId,
          organizationId: input.organizationId ?? undefined
        })
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticketStatusSeries"] });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ["ticket", variables.id] });
        queryClient.invalidateQueries({ queryKey: ["ticketMessages", variables.id] });
      }
    }
  });
}

type CreateTicketMessageInput = {
  ticketId: string;
  body: string;
  authorType?: "agent" | "player";
};

type TicketMessageResponse = {
  message: TicketMessage;
};

export function useCreateTicketMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTicketMessageInput): Promise<TicketMessageResponse> =>
      apiFetch<TicketMessageResponse>(`/v1/tickets/${input.ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: input.body,
          authorType: input.authorType ?? "agent"
        })
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticketMessages", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticketStatusSeries"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
    }
  });
}
