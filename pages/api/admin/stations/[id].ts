import { Prisma } from "@/generated/prisma/client";
import { ApiErrorItem, ApiResponses } from "@/lib/api-response";
import { getSessionFromRequest, isAdminRole } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

const updateStationSchema = z
  .object({
    name: z.string().trim().min(1, "Nama halte wajib diisi").optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radius: z.number().int().positive().optional(),
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

  const stationId = parseParam.data.id;

  if (req.method === "GET") {
    const station = await prisma.station.findUnique({
      where: {
        id: stationId,
      },
    });

    if (!station) {
      return ApiResponses.error(res, {
        status: 404,
        errors: [{ key: "NOT_FOUND", message: "Halte tidak ditemukan" }],
      });
    }

    return ApiResponses.success(res, station);
  }

  if (req.method === "PATCH") {
    const parseBody = updateStationSchema.safeParse(req.body);

    if (!parseBody.success) {
      return ApiResponses.error(res, {
        status: 400,
        errors: getValidationErrors(parseBody.error),
      });
    }

    try {
      const updatedStation = await prisma.station.update({
        where: { id: stationId },
        data: parseBody.data,
      });

      return ApiResponses.success(res, updatedStation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return ApiResponses.error(res, {
          status: 404,
          errors: [{ key: "NOT_FOUND", message: "Halte tidak ditemukan" }],
        });
      }

      return ApiResponses.error(res, {
        status: 500,
        errors: [
          { key: "INTERNAL_SERVER_ERROR", message: "Terjadi kesalahan" },
        ],
      });
    }
  }

  try {
    await prisma.station.delete({
      where: {
        id: stationId,
      },
    });

    return ApiResponses.success(res, { id: stationId });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return ApiResponses.error(res, {
        status: 404,
        errors: [{ key: "NOT_FOUND", message: "Halte tidak ditemukan" }],
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return ApiResponses.error(res, {
        status: 409,
        errors: [
          {
            key: "CONFLICT",
            message:
              "Halte tidak dapat dihapus karena masih dipakai pada rute tertentu",
          },
        ],
      });
    }

    return ApiResponses.error(res, {
      status: 500,
      errors: [{ key: "INTERNAL_SERVER_ERROR", message: "Terjadi kesalahan" }],
    });
  }
}
