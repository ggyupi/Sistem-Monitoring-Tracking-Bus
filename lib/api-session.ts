import { auth } from "@/lib/auth";
import { UserRole } from "@/types/user-role";

export async function getSessionFromRequest(req: unknown) {
  const headers = new Headers();

  if (typeof req === "object" && req !== null) {
    const maybeReq = req as { headers?: Record<string, string | string[] | undefined> | Headers };
    const cookieHeader =
      maybeReq.headers instanceof Headers
        ? maybeReq.headers.get("cookie")
        : maybeReq.headers?.cookie
        ? Array.isArray(maybeReq.headers.cookie)
          ? maybeReq.headers.cookie.join("; ")
          : maybeReq.headers.cookie
        : undefined;

    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }
  }

  return auth.api.getSession({ headers });
}

export function isAdminRole(role: unknown): role is UserRole.ADMIN {
  return role === UserRole.ADMIN;
}
