import { Prisma } from "@/generated/prisma/client";
import { ApiErrorItem, ApiResponses } from "@/lib/api-response";
import { getSessionFromRequest, isAdminRole } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

const jsonValueSchema = z.union([
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
]);

const updateRouteSchema = z
  .object({
    routeName: z.string().trim().min(1, "Nama rute wajib diisi").optional(),
    pathGeoJSON: jsonValueSchema.optional(),
    stationIds: z.array(z.string().trim().min(1)).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field harus diubah",
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
  if (
    req.method !== "GET" &&
    req.method !== "PATCH" &&
    req.method !== "DELETE"
  ) {
    res.setHeader("Allow", "GET, PATCH, DELETE");
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

  const parseParam = idParamSchema.safeParse({ id: req.query.id });

  if (!parseParam.success) {
    return ApiResponses.error(res, {
      status: 400,
      errors: getValidationErrors(parseParam.error),
    });
  }

  const routeId = parseParam.data.id;

  if (req.method === "GET") {
    const route = await prisma.route.findUnique({
      where: {
        id: routeId,
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

    if (!route) {
      return ApiResponses.error(res, {
        status: 404,
        errors: [{ key: "NOT_FOUND", message: "Rute tidak ditemukan" }],
      });
    }

    return ApiResponses.success(res, route);
  }

  if (req.method === "PATCH") {
    const parseBody = updateRouteSchema.safeParse(req.body);

    if (!parseBody.success) {
      return ApiResponses.error(res, {
        status: 400,
        errors: getValidationErrors(parseBody.error),
      });
    }

    const payload = parseBody.data;

    if (payload.stationIds) {
      const existingStations = await prisma.station.findMany({
        where: {
          id: {
            in: payload.stationIds,
          },
        },
        select: {
          id: true,
        },
      });

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
    }

    try {
      const updatedRoute = await prisma.$transaction(async (tx) => {
        if (payload.stationIds) {
          await tx.routeStation.deleteMany({
            where: {
              routeId,
            },
          });

          if (payload.stationIds.length) {
            await tx.routeStation.createMany({
              data: payload.stationIds.map((stationId, index) => ({
                routeId,
                stationId,
                order: index + 1,
              })),
            });
          }
        }

        return tx.route.update({
          where: {
            id: routeId,
          },
          data: {
            routeName: payload.routeName,
            pathGeoJSON: payload.pathGeoJSON
              ? toInputJsonValue(payload.pathGeoJSON)
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
      });

      return ApiResponses.success(res, updatedRoute);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return ApiResponses.error(res, {
          status: 404,
          errors: [{ key: "NOT_FOUND", message: "Rute tidak ditemukan" }],
        });
      }

      return ApiResponses.error(res, {
        status: 500,
        errors: [{ key: "INTERNAL_SERVER_ERROR", message: "Terjadi kesalahan" }],
      });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.routeStation.deleteMany({
        where: {
          routeId,
        },
      });

      await tx.route.delete({
        where: {
          id: routeId,
        },
      });
    });

    return ApiResponses.success(res, { id: routeId });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return ApiResponses.error(res, {
        status: 404,
        errors: [{ key: "NOT_FOUND", message: "Rute tidak ditemukan" }],
      });
    }

    return ApiResponses.error(res, {
      status: 500,
      errors: [{ key: "INTERNAL_SERVER_ERROR", message: "Terjadi kesalahan" }],
    });
  }
}
