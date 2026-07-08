"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/axios";
import type { ApiResponse, AuthUser, User } from "@/types";
import type { CreateUserFormValues, UpdateUserFormValues } from "@/lib/validations/userSchema";
import { useAuthStore } from "@/lib/store/authStore";

const USERS_KEY = ["users"] as const;

export const useUsers = (params?: Record<string, string>) => {
  return useQuery({
    queryKey: [...USERS_KEY, params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<User[]>>("/users", { params });
      return { data: response.data.data ?? [], pagination: response.data.pagination };
    },
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: [...USERS_KEY, id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<User>>(`/users/${id}`);
      return response.data.data!;
    },
    enabled: !!id,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUserFormValues) => {
      const response = await api.post<ApiResponse<User>>("/users", data);
      return response.data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("User created successfully");
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create user";
      toast.error(msg);
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserFormValues }) => {
      const response = await api.put<ApiResponse<User>>(`/users/${id}`, data);
      return response.data.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("User updated successfully");
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update user";
      toast.error(msg);
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("User deleted successfully");
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to delete user";
      toast.error(msg);
    },
  });
};

export const useImpersonateUser = () => {
  const { startImpersonation } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post<ApiResponse<{ token: string; user: AuthUser }>>(
        `/users/${userId}/impersonate`
      );
      return res.data.data!;
    },
    onSuccess: (data) => {
      startImpersonation(data.user, data.token);
      queryClient.clear();
      toast.success(`Now viewing as ${data.user.name}`);
      router.push("/dashboard");
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to impersonate user";
      toast.error(msg);
    },
  });
};
