import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { TenantMarketplaceSettings } from "@/types";

export function useTenantSettings() {
  return useQuery({
    queryKey: ["tenant-settings"],
    queryFn: () => api.get<TenantMarketplaceSettings>("/tenant/settings"),
  });
}

export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      marketplaceEnabled: boolean;
      country?: string;
      state?: string;
      lga?: string;
      city?: string;
      street?: string;
      streetNumber?: string;
      latitude?: number;
      longitude?: number;
    }) => api.patch<TenantMarketplaceSettings & { geocodeWarning: boolean }>("/tenant/settings", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-settings"] }),
  });
}
