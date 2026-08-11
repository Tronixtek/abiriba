import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { StockAdjustment } from "@/types";

export function useAuditLog() {
  return useQuery({
    queryKey: ["audit-log"],
    queryFn: () => api.get<StockAdjustment[]>("/audit/stock-adjustments"),
  });
}
