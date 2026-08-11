import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { Role, UserProfile } from "@/types";

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get<UserProfile[]>("/users"),
  });
}

export function useCreateStaffUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      password: string;
      role: Extract<Role, "MANAGER" | "STAFF">;
    }) => api.post<UserProfile>("/users", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}
