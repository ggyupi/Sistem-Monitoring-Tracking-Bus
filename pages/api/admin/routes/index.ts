import { ApiErrorItem, ApiResponses } from "@/lib/api-response";
import { getSessionFromRequest, isAdminRole } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const listRoutesQuerySchema = z.object({
  search: z.string().trim().optional(),
});

const jsonValueSchema = z.union([
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
]);

const createRouteSchema = z.object({
  routeName: z.string().trim().min(1, "Nama rute wajib diisi"),
  pathGeoJSON: jsonValueSchema,
  stationIds: z.array(z.string().trim().min(1)).default([]),
});

function getValidationErrors(error: z.ZodError): ApiErrorItem[] {
  return error.issues.map((issue) => ({
    key: "VALIDATION_ERROR",
    field: issue.path.join("."),
    message: issue.message,
  }));
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
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
    const parseQuery = listRoutesQuerySchema.safeParse({
      search: req.query.search,
    });

    if (!parseQuery.success) {
      return ApiResponses.error(res, {
        status: 400,
        errors: getValidationErrors(parseQuery.error),
      });
    }

    const search = parseQuery.data.search?.trim();

    const [routes, stations] = await prisma.$transaction([
      prisma.route.findMany({
        where: search
          ? {
              routeName: {
                contains: search,
                mode: "insensitive",
              },
            }
          : undefined,
        include: {
          stations: {
            include: {
              station: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          routeName: "asc",
        },
      }),
      prisma.station.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    return ApiResponses.success(
      res,
      {
        routes,
        stations,
      },
      {
        meta: {
          total: routes.length,
        },
      },
    );
  }

  const parseBody = createRouteSchema.safeParse(req.body);

  if (!parseBody.success) {
    return ApiResponses.error(res, {
      status: 400,
      errors: getValidationErrors(parseBody.error),
    });
  }

  const payload = parseBody.data;

  const existingStations = payload.stationIds.length
    ? await prisma.station.findMany({
        where: {
          id: {
            in: payload.stationIds,
          },
        },
        select: {
          id: true,
        },
      })
    : [];

  if (existingStations.length !== payload.stationIds.length) {
    return ApiResponses.error(res, {
      status: 400,
      errors: [
        {
          key: "VALIDATION_ERROR",
          field: "stationIds",
          message: "Sebagian stationIds tidak ditemukan",
        },
      ],
    });
  }

  const route = await prisma.route.create({
    data: {
      routeName: payload.routeName,
      pathGeoJSON: toInputJsonValue(payload.pathGeoJSON),
      stations: payload.stationIds.length
        ? {
            create: payload.stationIds.map((stationId, index) => ({
              stationId,
              order: index + 1,
            })),
          }
        : undefined,
    },
    include: {
      stations: {
        include: {
          station: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  return ApiResponses.success(res, route, { status: 201 });
}
