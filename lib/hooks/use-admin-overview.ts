import { useQuery } from "@tanstack/react-query";

import { requestApi } from "@/lib/api-client";

type AdminOverview = {
  users: number;
  buses: number;
  activeBuses: number;
  inactiveBuses: number;
  routes: number;
  stations: number;
  cards: number;
  transactions: number;
  totalPassengerCount: number;
  uptimeSeconds: number;
};

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => requestApi<AdminOverview>("/api/admin/overview"),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
    enabled: true, // Ensure query starts immediately
    retry: 2, // Retry on failure
  });
}
