import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin/adminApiClient";
import type { AdminStats, AdminTenantDetail, AdminTenantSummary, AdminTrendPoint } from "@/types";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminApi.get<AdminStats>("/admin/stats"),
  });
}

export function useAdminTrends(days: number) {
  return useQuery({
    queryKey: ["admin", "stats", "trends", days],
    queryFn: () => adminApi.get<AdminTrendPoint[]>(`/admin/stats/trends?days=${days}`),
    placeholderData: (prev) => prev,
  });
}

export function useAdminTenants() {
  return useQuery({
    queryKey: ["admin", "tenants"],
    queryFn: () => adminApi.get<AdminTenantSummary[]>("/admin/tenants"),
  });
}

export function useAdminTenantDetail(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "tenants", tenantId],
    queryFn: () => adminApi.get<AdminTenantDetail>(`/admin/tenants/${tenantId}`),
    enabled: !!tenantId,
  });
}
