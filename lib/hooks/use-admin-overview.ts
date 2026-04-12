import { useQuery } from "@tanstack/react-query";

import { requestApi } from "@/lib/api-client";

type AdminOverview = {
  users: number;
  buses: number;
  routes: number;
  stations: number;
  cards: number;
  transactions: number;
};

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => requestApi<AdminOverview>("/api/admin/overview"),
  });
}
