import { NextApiRequest } from "next";

import { auth } from "@/lib/auth";
import { UserRole } from "@/types/user-role";

export async function getSessionFromRequest(req: NextApiRequest) {
  const headers = new Headers();

  if (req.headers.cookie) {
    headers.set("cookie", req.headers.cookie);
  }

  return auth.api.getSession({ headers });
}

export function isAdminRole(role: unknown): role is UserRole.ADMIN {
  return role === UserRole.ADMIN;
}
