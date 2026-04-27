import { Prisma } from "@/generated/prisma/client";
import { ApiErrorItem, ApiResponses } from "@/lib/api-response";
import { getSessionFromRequest, isAdminRole } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

const updateBusSchema = z
  .object({
    busCode: z.string().trim().min(1, "Kode bus wajib diisi").optional(),
    plateNumber: z
      .string()
      .trim()
      .min(1, "Nomor polisi wajib diisi")
      .optional(),
    isActive: z.boolean().optional(),
    maxPassengers: z.coerce
      .number()
      .int()
      .min(1, "Kapasitas maksimal minimal 1")
      .optional(),
    routeId: z.string().trim().min(1).optional().nullable(),
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

  const busId = parseParam.data.id;

  if (req.method === "GET") {
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: {
        route: {
          select: {
            id: true,
            routeName: true,
          },
        },
      },
    });

    if (!bus) {
      return ApiResponses.error(res, {
        status: 404,
        errors: [{ key: "NOT_FOUND", message: "Bus tidak ditemukan" }],
      });
    }

    return ApiResponses.success(res, bus);
  }

  if (req.method === "PATCH") {
    const parseBody = updateBusSchema.safeParse(req.body);

    if (!parseBody.success) {
      return ApiResponses.error(res, {
        status: 400,
        errors: getValidationErrors(parseBody.error),
      });
    }

    const payload = parseBody.data;

    if (payload.routeId) {
      const route = await prisma.route.findUnique({
        where: { id: payload.routeId },
      });
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
      const updatedBus = await prisma.bus.update({
        where: { id: busId },
        data: {
          busCode: payload.busCode,
          plateNumber: payload.plateNumber,
          isActive: payload.isActive,
          maxPassengers: payload.maxPassengers,
          routeId:
            payload.routeId === null ? null : (payload.routeId ?? undefined),
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

      return ApiResponses.success(res, updatedBus);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return ApiResponses.error(res, {
            status: 404,
            errors: [{ key: "NOT_FOUND", message: "Bus tidak ditemukan" }],
          });
        }

        if (error.code === "P2002") {
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
      }

      return ApiResponses.error(res, {
        status: 500,
        errors: [
          {
            key: "INTERNAL_SERVER_ERROR",
            message: "Terjadi kesalahan saat memperbarui bus",
          },
        ],
      });
    }
  }

  try {
    await prisma.bus.delete({
      where: { id: busId },
    });

    return ApiResponses.success(res, { id: busId });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return ApiResponses.error(res, {
        status: 404,
        errors: [{ key: "NOT_FOUND", message: "Bus tidak ditemukan" }],
      });
    }

    return ApiResponses.error(res, {
      status: 500,
      errors: [
        {
          key: "INTERNAL_SERVER_ERROR",
          message: "Terjadi kesalahan saat menghapus bus",
        },
      ],
    });
  }
}
