import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { Customer } from "@/types";

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<Customer[]>("/customers"),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email?: string; phone?: string }) =>
      api.post<Customer>("/customers", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}
