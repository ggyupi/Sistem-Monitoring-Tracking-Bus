import { ApiResponses } from "@/lib/api-response";
import { getSessionFromRequest, isAdminRole } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return ApiResponses.error(res, {
      status: 405,
      errors: [{ key: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" }],
    });
  }

  const session = await getSessionFromRequest(req);

  if (!session?.user) {
    return ApiResponses.error(res, {
      status: 401,
      errors: [{ key: "UNAUTHORIZED", message: "Unauthorized" }],
    });
  }

  if (!isAdminRole(session.user.role)) {
    return ApiResponses.error(res, {
      status: 403,
      errors: [{ key: "FORBIDDEN", message: "Forbidden" }],
    });
  }

  const [users, buses, routes, stations, cards, transactions, activeBuses, passengerAggregate] =
    await prisma.$transaction([
      prisma.user.count(),
      prisma.bus.count(),
      prisma.route.count(),
      prisma.station.count(),
      prisma.card.count(),
      prisma.transaction.count(),
      prisma.bus.count({ where: { isActive: true } }),
      prisma.bus.aggregate({ _sum: { passengerCount: true } }),
    ]);

  const inactiveBuses = buses - activeBuses;
  const totalPassengerCount = passengerAggregate._sum.passengerCount ?? 0;
  const uptimeSeconds = Math.floor(process.uptime());

  return ApiResponses.success(res, {
    users,
    buses,
    activeBuses,
    inactiveBuses,
    routes,
    stations,
    cards,
    transactions,
    totalPassengerCount,
    uptimeSeconds,
  });
}
