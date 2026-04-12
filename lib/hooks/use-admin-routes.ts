import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestApi } from "@/lib/api-client";

export type RouteStationLink = {
  order: number;
  station: {
    id: string;
    name: string;
  };
};

export type RouteItem = {
  id: string;
  routeName: string;
  pathGeoJSON: unknown;
  stations: RouteStationLink[];
};

export type StationOption = {
  id: string;
  name: string;
};

type RoutesListPayload = {
  routes: RouteItem[];
  stations: StationOption[];
};

type RoutePayload = {
  routeName: string;
  pathGeoJSON: unknown;
  stationIds: string[];
};

const routesKeys = {
  all: ["admin", "routes"] as const,
  list: (search: string) => ["admin", "routes", "list", search] as const,
};

export function useAdminRoutes(search: string) {
  return useQuery({
    queryKey: routesKeys.list(search),
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const query = params.toString();
      const url = query ? `/api/admin/routes?${query}` : "/api/admin/routes";

      return requestApi<RoutesListPayload>(url);
    },
  });
}

export function useCreateRouteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RoutePayload) =>
      requestApi<RouteItem>("/api/admin/routes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: routesKeys.all,
      });
    },
  });
}

export function useUpdateRouteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RoutePayload }) =>
      requestApi<RouteItem>(`/api/admin/routes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: routesKeys.all,
      });
    },
  });
}

export function useDeleteRouteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      requestApi<{ id: string }>(`/api/admin/routes/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: routesKeys.all,
      });
    },
  });
}
