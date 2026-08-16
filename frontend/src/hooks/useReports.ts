import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { SalesReport, SalesTrendPoint } from "@/types";

export function useSalesReport(range: "day" | "week" | "month") {
  return useQuery({
    queryKey: ["reports", "sales", range],
    queryFn: () => api.get<SalesReport>(`/reports/sales?range=${range}`),
  });
}

export function useSalesTrends(days: number) {
  return useQuery({
    queryKey: ["reports", "sales", "trends", days],
    queryFn: () => api.get<SalesTrendPoint[]>(`/reports/sales/trends?days=${days}`),
    placeholderData: (prev) => prev,
  });
}
