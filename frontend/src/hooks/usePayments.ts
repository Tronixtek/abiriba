import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { PublicOrder, SafeHavenPaymentDetails } from "@/types";

export function useInitializePayment(slug: string) {
  return useMutation({
    mutationFn: (orderId: string) => api.post<SafeHavenPaymentDetails>(`/public/${slug}/orders/${orderId}/pay`),
  });
}

// Actively re-verifies with SafeHaven (idempotent server-side) rather than
// just re-reading the order, so a dropped webhook doesn't leave the
// customer waiting. Stops once the order is no longer OPEN, or on an error
// (the "check now" button can still retry).
export function usePaymentStatus(slug: string, orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["public-payment-status", slug, orderId],
    queryFn: () => api.post<PublicOrder>(`/public/${slug}/orders/${orderId}/verify-payment`),
    enabled,
    retry: false,
    refetchInterval: (query) => {
      if (query.state.status === "error") return false;
      return !query.state.data || query.state.data.status === "OPEN" ? 10_000 : false;
    },
  });
}
