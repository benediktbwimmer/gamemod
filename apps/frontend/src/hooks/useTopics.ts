import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { Topic } from "@/lib/types";

type TopicsResponse = {
  topics: Topic[];
};

type TopicResponse = {
  topic: Topic;
};

type CreateTopicInput = {
  name: string;
  description?: string;
  adminKey: string;
};

export function useTopicsQuery() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: (): Promise<TopicsResponse> => apiFetch<TopicsResponse>("/v1/topics"),
    staleTime: 60_000
  });
}

export function useCreateTopicMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTopicInput): Promise<TopicResponse> =>
      apiFetch<TopicResponse>("/v1/topics", {
        method: "POST",
        headers: {
          "x-admin-key": input.adminKey
        },
        body: JSON.stringify({
          name: input.name,
          description: input.description
        })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    }
  });
}
