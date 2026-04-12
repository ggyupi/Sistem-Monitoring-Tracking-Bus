import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestApi } from "@/lib/api-client";
import { UserRole } from "@/types/user-role";

type UserCardItem = {
  rfidTag: string;
  status: string;
};

export type UserItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  cards: UserCardItem[];
};

type UsersListPayload = {
  users: UserItem[];
  roles: UserRole[];
};

type CreateUserPayload = {
  name: string;
  email: string;
  role: UserRole;
};

type UpdateUserPayload = Partial<CreateUserPayload>;

const usersKeys = {
  all: ["admin", "users"] as const,
  list: (search: string, role: UserRole | "ALL") =>
    ["admin", "users", "list", search, role] as const,
};

export function useAdminUsers(search: string, role: UserRole | "ALL") {
  return useQuery({
    queryKey: usersKeys.list(search, role),
    queryFn: () => {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (role !== "ALL") {
        params.set("role", role);
      }

      const query = params.toString();
      const url = query ? `/api/admin/users?${query}` : "/api/admin/users";

      return requestApi<UsersListPayload>(url);
    },
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) =>
      requestApi<UserItem>("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      requestApi<UserItem>(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      requestApi<{ id: string }>(`/api/admin/users/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}
