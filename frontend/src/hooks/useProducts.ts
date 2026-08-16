import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { Product } from "@/types";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<Product[]>("/products"),
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ["products", "low-stock"],
    queryFn: () => api.get<Product[]>("/products/low-stock"),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      sku: string;
      name: string;
      description?: string;
      price: number;
      quantity: number;
      lowStockThreshold: number;
    }) => api.post<Product>("/products", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      ...data
    }: {
      productId: string;
      name?: string;
      description?: string;
      price?: number;
      lowStockThreshold?: number;
      isActive?: boolean;
    }) => api.patch<Product>(`/products/${productId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);
      return api.upload<Product>(`/products/${productId}/images`, formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, imageId }: { productId: string; imageId: string }) =>
      api.delete<Product>(`/products/${productId}/images/${imageId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      ...data
    }: {
      productId: string;
      delta: number;
      reason: "RESTOCK" | "MANUAL_CORRECTION";
      note?: string;
    }) => api.post<Product>(`/products/${productId}/adjust-stock`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
    },
  });
}
