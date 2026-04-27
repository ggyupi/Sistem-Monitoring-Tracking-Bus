import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestApi } from "@/lib/api-client";

export type RouteOption = {
  id: string;
  routeName: string;
};

export type BusItem = {
  id: string;
  busCode: string;
  plateNumber: string;
  isActive: boolean;
  passengerCount: number;
  maxPassengers: number;
  routeId: string | null;
  route: RouteOption | null;
};

type BusesListPayload = {
  buses: BusItem[];
  routes: RouteOption[];
};

type BusUpsertPayload = {
  busCode: string;
  plateNumber: string;
  isActive: boolean;
  maxPassengers: number;
  routeId: string | null;
};

const busesKeys = {
  all: ["admin", "buses"] as const,
  list: (search: string) => ["admin", "buses", "list", search] as const,
};

export function useAdminBuses(search: string) {
  return useQuery({
    queryKey: busesKeys.list(search),
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const query = params.toString();
      const url = query ? `/api/admin/buses?${query}` : "/api/admin/buses";

      return requestApi<BusesListPayload>(url);
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateBusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BusUpsertPayload) =>
      requestApi<BusItem>("/api/admin/buses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: busesKeys.all,
      });
    },
  });
}

export function useUpdateBusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BusUpsertPayload }) =>
      requestApi<BusItem>(`/api/admin/buses/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: busesKeys.all,
      });
    },
  });
}

export function useDeleteBusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      requestApi<{ id: string }>(`/api/admin/buses/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: busesKeys.all,
      });
    },
  });
}
