import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestApi } from "@/lib/api-client";
import { TransactionTypeValue } from "@/types/transaction-type";

type TransactionItem = {
  id: string;
  type: TransactionTypeValue;
  amount: number;
  latTap: number | null;
  lngTap: number | null;
  createdAt: string;
  rfidTag: string;
  busId: string;
  stationName: string | null;
  card: {
    rfidTag: string;
  };
  bus: {
    id: string;
    busCode: string;
  };
};

type TransactionPayload = {
  type: TransactionTypeValue;
  amount: number;
  rfidTag: string;
  busId: string;
  stationName?: string;
  latTap?: number;
  lngTap?: number;
};

type TransactionsListPayload = {
  transactions: TransactionItem[];
  cards: Array<{ rfidTag: string }>;
  buses: Array<{ id: string; busCode: string; plateNumber: string }>;
  types: TransactionTypeValue[];
};

const transactionKeys = {
  all: ["admin", "transactions"] as const,
  list: (search: string, type: TransactionTypeValue | "ALL") =>
    ["admin", "transactions", "list", search, type] as const,
};

export function useAdminTransactions(
  search: string,
  type: TransactionTypeValue | "ALL",
) {
  return useQuery({
    queryKey: transactionKeys.list(search, type),
    queryFn: () => {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (type !== "ALL") {
        params.set("type", type);
      }

      const query = params.toString();
      const url = query
        ? `/api/admin/transactions?${query}`
        : "/api/admin/transactions";

      return requestApi<TransactionsListPayload>(url);
    },
  });
}

export function useCreateTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TransactionPayload) =>
      requestApi<TransactionItem>("/api/admin/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: transactionKeys.all,
      });
    },
  });
}

export function useDeleteTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      requestApi<{ id: string }>(`/api/admin/transactions/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: transactionKeys.all,
      });
    },
  });
}
