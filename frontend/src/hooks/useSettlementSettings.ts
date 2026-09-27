import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { Bank, Payout, SettlementMode, TenantSettlementSettings } from "@/types";

export function useSettlementSettings() {
  return useQuery({
    queryKey: ["settlement-settings"],
    queryFn: () => api.get<TenantSettlementSettings>("/tenant/settlement"),
  });
}

export function useSettlementBanks() {
  return useQuery({
    queryKey: ["settlement-banks"],
    queryFn: () => api.get<Bank[]>("/tenant/settlement/banks"),
    staleTime: 60 * 60 * 1000,
  });
}

export function useVerifySettlementAccount() {
  return useMutation({
    mutationFn: (data: { bankCode: string; accountNumber: string }) =>
      api.post<{ accountName: string }>("/tenant/settlement/verify-account", data),
  });
}

export function useUpdateSettlementSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { settlementMode: SettlementMode; bankCode?: string; accountNumber?: string }) =>
      api.patch<TenantSettlementSettings>("/tenant/settlement", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settlement-settings"] }),
  });
}

export function usePayouts() {
  return useQuery({
    queryKey: ["payouts"],
    queryFn: () => api.get<Payout[]>("/payouts"),
  });
}
