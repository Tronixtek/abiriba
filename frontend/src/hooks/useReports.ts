import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { SalesReport } from "@/types";

export function useSalesReport(range: "day" | "week" | "month") {
  return useQuery({
    queryKey: ["reports", "sales", range],
    queryFn: () => api.get<SalesReport>(`/reports/sales?range=${range}`),
  });
}
