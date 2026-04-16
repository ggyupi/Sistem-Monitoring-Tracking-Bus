import { Prisma } from "@/generated/prisma/client";
import { ApiErrorItem, ApiResponses } from "@/lib/api-response";
import { getSessionFromRequest, isAdminRole } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const listBusesQuerySchema = z.object({
  search: z.string().trim().optional(),
});

const createBusSchema = z.object({
  busCode: z.string().trim().min(1, "Kode bus wajib diisi"),
  plateNumber: z.string().trim().min(1, "Nomor polisi wajib diisi"),
  isActive: z.boolean().optional().default(true),
  routeId: z.string().trim().min(1).optional().nullable(),
});

function getValidationErrors(error: z.ZodError): ApiErrorItem[] {
  return error.issues.map((issue) => ({
    key: "VALIDATION_ERROR",
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
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

  if (req.method === "GET") {
    const parseQuery = listBusesQuerySchema.safeParse({
      search: req.query.search,
    });

    if (!parseQuery.success) {
      return ApiResponses.error(res, {
        status: 400,
        errors: getValidationErrors(parseQuery.error),
      });
    }

    const search = parseQuery.data.search?.trim();

    const [buses, routes] = await prisma.$transaction([
      prisma.bus.findMany({
        where: search
          ? {
              OR: [
                {
                  busCode: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  plateNumber: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  route: {
                    routeName: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : undefined,
        include: {
          route: {
            select: {
              id: true,
              routeName: true,
            },
          },
        },
        orderBy: {
          busCode: "asc",
        },
      }),
      prisma.route.findMany({
        select: {
          id: true,
          routeName: true,
        },
        orderBy: {
          routeName: "asc",
        },
      }),
    ]);

    return ApiResponses.success(
      res,
      {
        buses,
        routes,
      },
      {
        meta: {
          total: buses.length,
        },
      },
    );
  }

  const parseBody = createBusSchema.safeParse(req.body);

  if (!parseBody.success) {
    return ApiResponses.error(res, {
      status: 400,
      errors: getValidationErrors(parseBody.error),
    });
  }

  const payload = parseBody.data;

  if (payload.routeId) {
    const route = await prisma.route.findUnique({ where: { id: payload.routeId } });
    if (!route) {
      return ApiResponses.error(res, {
        status: 400,
        errors: [
          {
            key: "VALIDATION_ERROR",
            field: "routeId",
            message: "Rute tidak ditemukan",
          },
        ],
      });
    }
  }

  try {
    const bus = await prisma.bus.create({
      data: {
        busCode: payload.busCode,
        plateNumber: payload.plateNumber,
        isActive: payload.isActive,
        routeId: payload.routeId ?? undefined,
      },
      include: {
        route: {
          select: {
            id: true,
            routeName: true,
          },
        },
      },
    });

    return ApiResponses.success(res, bus, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return ApiResponses.error(res, {
        status: 409,
        errors: [
          {
            key: "CONFLICT",
            field: "busCode",
            message: "Kode bus sudah terdaftar",
          },
        ],
      });
    }

    return ApiResponses.error(res, {
      status: 500,
      errors: [{ key: "INTERNAL_SERVER_ERROR", message: "Terjadi kesalahan saat membuat bus" }],
    });
  }
}
