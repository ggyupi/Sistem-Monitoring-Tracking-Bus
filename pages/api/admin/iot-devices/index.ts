import { createHash } from "crypto";

import { DeviceStatus, Prisma } from "@/generated/prisma";
import { ApiErrorItem, ApiResponses } from "@/lib/api-response";
import { getSessionFromRequest, isAdminRole } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const listDevicesQuerySchema = z.object({
  search: z.string().trim().optional(),
});

const createDeviceSchema = z.object({
  serialNumber: z.string().trim().min(1, "Serial number wajib diisi"),
  deviceKey: z.string().trim().min(8, "Device key minimal 8 karakter"),
  status: z.nativeEnum(DeviceStatus).default(DeviceStatus.ACTIVE),
  firmwareVer: z.string().trim().optional().nullable(),
  currentBusId: z.string().trim().min(1).optional().nullable(),
});

function getValidationErrors(error: z.ZodError): ApiErrorItem[] {
  return error.issues.map((issue) => ({
    key: "VALIDATION_ERROR",
    field: issue.path.join("."),
    message: issue.message,
  }));
}

function hashDeviceKey(deviceKey: string) {
  return createHash("sha256").update(deviceKey).digest("hex");
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
    const parseQuery = listDevicesQuerySchema.safeParse({
      search: req.query.search,
    });

    if (!parseQuery.success) {
      return ApiResponses.error(res, {
        status: 400,
        errors: getValidationErrors(parseQuery.error),
      });
    }

    const search = parseQuery.data.search?.trim();

    const [devices, buses] = await prisma.$transaction([
      prisma.iotDevice.findMany({
        where: search
          ? {
              OR: [
                {
                  serialNumber: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  firmwareVer: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  currentBus: {
                    busCode: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  currentBus: {
                    plateNumber: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : undefined,
        include: {
          currentBus: {
            select: {
              id: true,
              busCode: true,
              plateNumber: true,
              isActive: true,
            },
          },
          assignments: {
            include: {
              bus: {
                select: {
                  id: true,
                  busCode: true,
                  plateNumber: true,
                },
              },
            },
            orderBy: {
              assignedAt: "desc",
            },
            take: 5,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.bus.findMany({
        select: {
          id: true,
          busCode: true,
          plateNumber: true,
          isActive: true,
        },
        orderBy: {
          busCode: "asc",
        },
      }),
    ]);

    return ApiResponses.success(
      res,
      {
        devices,
        buses,
      },
      {
        meta: {
          total: devices.length,
        },
      },
    );
  }

  const parseBody = createDeviceSchema.safeParse(req.body);

  if (!parseBody.success) {
    return ApiResponses.error(res, {
      status: 400,
      errors: getValidationErrors(parseBody.error),
    });
  }

  const payload = parseBody.data;

  if (payload.currentBusId) {
    const bus = await prisma.bus.findUnique({
      where: { id: payload.currentBusId },
      select: { id: true },
    });

    if (!bus) {
      return ApiResponses.error(res, {
        status: 400,
        errors: [
          {
            key: "VALIDATION_ERROR",
            field: "currentBusId",
            message: "Bus tidak ditemukan",
          },
        ],
      });
    }
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const device = await tx.iotDevice.create({
        data: {
          serialNumber: payload.serialNumber,
          deviceKeyHash: hashDeviceKey(payload.deviceKey),
          status: payload.status,
          firmwareVer: payload.firmwareVer?.trim() || null,
          currentBusId: payload.currentBusId ?? undefined,
        },
      });

      if (payload.currentBusId) {
        await tx.busDeviceAssignment.create({
          data: {
            busId: payload.currentBusId,
            iotDeviceId: device.id,
          },
        });
      }

      return tx.iotDevice.findUniqueOrThrow({
        where: { id: device.id },
        include: {
          currentBus: {
            select: {
              id: true,
              busCode: true,
              plateNumber: true,
              isActive: true,
            },
          },
          assignments: {
            include: {
              bus: {
                select: {
                  id: true,
                  busCode: true,
                  plateNumber: true,
                },
              },
            },
            orderBy: {
              assignedAt: "desc",
            },
            take: 5,
          },
        },
      });
    });

    return ApiResponses.success(res, created, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta?.target as string[])
        : [];

      if (target.includes("serialNumber")) {
        return ApiResponses.error(res, {
          status: 409,
          errors: [
            {
              key: "CONFLICT",
              field: "serialNumber",
              message: "Serial number sudah terdaftar",
            },
          ],
        });
      }

      if (target.includes("deviceKeyHash")) {
        return ApiResponses.error(res, {
          status: 409,
          errors: [
            {
              key: "CONFLICT",
              field: "deviceKey",
              message: "Device key sudah digunakan",
            },
          ],
        });
      }

      if (target.includes("currentBusId")) {
        return ApiResponses.error(res, {
          status: 409,
          errors: [
            {
              key: "CONFLICT",
              field: "currentBusId",
              message: "Bus sudah dipakai device lain",
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
          message: "Terjadi kesalahan saat membuat IoT device",
        },
      ],
    });
  }
}
