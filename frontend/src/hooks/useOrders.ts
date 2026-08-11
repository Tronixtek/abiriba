import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { Order, PaymentMethod } from "@/types";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<Order[]>("/orders"),
    // Light polling so customer-submitted (QR) orders show up for staff
    // without a manual refresh — no websockets needed at this scale.
    refetchInterval: 15_000,
  });
}

function invalidateAfterOrderChange(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["orders"] });
  queryClient.invalidateQueries({ queryKey: ["products"] });
  queryClient.invalidateQueries({ queryKey: ["audit-log"] });
  queryClient.invalidateQueries({ queryKey: ["reports"] });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { customerId?: string; items: { productId: string; quantity: number }[] }) =>
      api.post<Order>("/orders", data),
    onSuccess: () => invalidateAfterOrderChange(queryClient),
  });
}

export function usePayOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, method }: { orderId: string; method: PaymentMethod }) =>
      api.post<Order>(`/orders/${orderId}/pay`, { method }),
    onSuccess: () => invalidateAfterOrderChange(queryClient),
  });
}

export function useVoidOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      api.post<Order>(`/orders/${orderId}/void`, { reason }),
    onSuccess: () => invalidateAfterOrderChange(queryClient),
  });
}
