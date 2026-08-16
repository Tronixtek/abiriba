import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { AiChatMessage, AiProposedItem } from "@/types";

export function useAiChatMessages() {
  return useQuery({
    queryKey: ["ai-chat"],
    queryFn: () => api.get<AiChatMessage[]>("/ai"),
  });
}

export function useSendAiChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ message, image }: { message?: string; image?: File }) => {
      const formData = new FormData();
      if (message) formData.append("message", message);
      if (image) formData.append("image", image);
      return api.upload<AiChatMessage>("/ai", formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-chat"] }),
  });
}

export function useApplyAiProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      items,
    }: {
      messageId: string;
      items: (AiProposedItem & { include: boolean })[];
    }) => api.post<{ message: AiChatMessage; products: unknown[] }>(`/ai/${messageId}/apply`, { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-chat"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
    },
  });
}

export function useRejectAiProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => api.post<AiChatMessage>(`/ai/${messageId}/reject`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-chat"] }),
  });
}
