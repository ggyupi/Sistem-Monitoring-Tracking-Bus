import { ApiResponse } from "@/lib/api-response";

export async function requestApi<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    const message = payload.success
      ? "Request gagal"
      : payload.errors[0]?.message ?? "Request gagal";
    throw new Error(message);
  }

  return payload.data;
}
