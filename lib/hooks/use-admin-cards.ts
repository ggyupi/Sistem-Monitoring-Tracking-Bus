import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestApi } from "@/lib/api-client";

export type CardOptionUser = {
  id: string;
  name: string;
  email: string;
};

export type CardOptionBus = {
  id: string;
  busCode: string;
  plateNumber: string;
};

export type CardItem = {
  rfidTag: string;
  balance: number;
  isInside: boolean;
  status: string;
  userId: string | null;
  lastBusId: string | null;
  user: CardOptionUser | null;
  lastBus: CardOptionBus | null;
};

type CardsListPayload = {
  cards: CardItem[];
  users: CardOptionUser[];
  buses: CardOptionBus[];
};

type CardPayload = {
  rfidTag: string;
  balance: number;
  isInside: boolean;
  status: string;
  userId: string | null;
  lastBusId: string | null;
};

type UpdateCardPayload = Omit<CardPayload, "rfidTag">;

const cardsKeys = {
  all: ["admin", "cards"] as const,
  list: (search: string) => ["admin", "cards", "list", search] as const,
};

export function useAdminCards(search: string) {
  return useQuery({
    queryKey: cardsKeys.list(search),
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const query = params.toString();
      const url = query ? `/api/admin/cards?${query}` : "/api/admin/cards";

      return requestApi<CardsListPayload>(url);
    },
  });
}

export function useCreateCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CardPayload) =>
      requestApi<CardItem>("/api/admin/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: cardsKeys.all,
      });
    },
  });
}

export function useUpdateCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      rfidTag,
      payload,
    }: {
      rfidTag: string;
      payload: UpdateCardPayload;
    }) =>
      requestApi<CardItem>(`/api/admin/cards/${rfidTag}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: cardsKeys.all,
      });
    },
  });
}

export function useDeleteCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rfidTag: string) =>
      requestApi<{ rfidTag: string }>(`/api/admin/cards/${rfidTag}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: cardsKeys.all,
      });
    },
  });
}
