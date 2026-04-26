import { createHash } from "crypto";

import { DeviceStatus, Prisma } from "@/generated/prisma";
import { ApiErrorItem, ApiResponses } from "@/lib/api-response";
import { getSessionFromRequest, isAdminRole } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

const updateDeviceSchema = z
  .object({
    serialNumber: z
      .string()
      .trim()
      .min(1, "Serial number wajib diisi")
      .optional(),
    deviceKey: z
      .string()
      .trim()
      .min(8, "Device key minimal 8 karakter")
      .optional(),
    status: z.nativeEnum(DeviceStatus).optional(),
    firmwareVer: z.string().trim().optional().nullable(),
    currentBusId: z.string().trim().min(1).optional().nullable(),
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

function hashDeviceKey(deviceKey: string) {
  return createHash("sha256").update(deviceKey).digest("hex");
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

  const deviceId = parseParam.data.id;

  if (req.method === "GET") {
    const device = await prisma.iotDevice.findUnique({
      where: { id: deviceId },
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
          take: 10,
        },
      },
    });

    if (!device) {
      return ApiResponses.error(res, {
        status: 404,
        errors: [{ key: "NOT_FOUND", message: "IoT device tidak ditemukan" }],
      });
    }

    return ApiResponses.success(res, device);
  }

  if (req.method === "PATCH") {
    const parseBody = updateDeviceSchema.safeParse(req.body);

    if (!parseBody.success) {
      return ApiResponses.error(res, {
        status: 400,
        errors: getValidationErrors(parseBody.error),
      });
    }

    const payload = parseBody.data;

    const existingDevice = await prisma.iotDevice.findUnique({
      where: { id: deviceId },
      select: {
        id: true,
        currentBusId: true,
      },
    });

    if (!existingDevice) {
      return ApiResponses.error(res, {
        status: 404,
        errors: [{ key: "NOT_FOUND", message: "IoT device tidak ditemukan" }],
      });
    }

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
      const updated = await prisma.$transaction(async (tx) => {
        const shouldUpdateAssignment =
          payload.currentBusId !== undefined &&
          payload.currentBusId !== existingDevice.currentBusId;

        if (shouldUpdateAssignment && existingDevice.currentBusId) {
          await tx.busDeviceAssignment.updateMany({
            where: {
              iotDeviceId: deviceId,
              unassignedAt: null,
            },
            data: {
              unassignedAt: new Date(),
            },
          });
        }

        await tx.iotDevice.update({
          where: { id: deviceId },
          data: {
            serialNumber: payload.serialNumber,
            deviceKeyHash: payload.deviceKey
              ? hashDeviceKey(payload.deviceKey)
              : undefined,
            status: payload.status,
            firmwareVer:
              payload.firmwareVer === undefined
                ? undefined
                : payload.firmwareVer?.trim() || null,
            currentBusId:
              payload.currentBusId === undefined
                ? undefined
                : payload.currentBusId,
          },
        });

        if (shouldUpdateAssignment && payload.currentBusId) {
          await tx.busDeviceAssignment.create({
            data: {
              busId: payload.currentBusId,
              iotDeviceId: deviceId,
            },
          });
        }

        return tx.iotDevice.findUniqueOrThrow({
          where: { id: deviceId },
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
              take: 10,
            },
          },
        });
      });

      return ApiResponses.success(res, updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return ApiResponses.error(res, {
            status: 404,
            errors: [
              { key: "NOT_FOUND", message: "IoT device tidak ditemukan" },
            ],
          });
        }

        if (error.code === "P2002") {
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
      }

      return ApiResponses.error(res, {
        status: 500,
        errors: [
          {
            key: "INTERNAL_SERVER_ERROR",
            message: "Terjadi kesalahan saat memperbarui IoT device",
          },
        ],
      });
    }
  }

  const existingDevice = await prisma.iotDevice.findUnique({
    where: { id: deviceId },
    select: { id: true },
  });

  if (!existingDevice) {
    return ApiResponses.error(res, {
      status: 404,
      errors: [{ key: "NOT_FOUND", message: "IoT device tidak ditemukan" }],
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.busDeviceAssignment.updateMany({
        where: {
          iotDeviceId: deviceId,
          unassignedAt: null,
        },
        data: {
          unassignedAt: new Date(),
        },
      });

      await tx.busDeviceAssignment.deleteMany({
        where: { iotDeviceId: deviceId },
      });

      await tx.iotDevice.delete({
        where: { id: deviceId },
      });
    });

    return ApiResponses.success(res, { id: deviceId });
  } catch {
    return ApiResponses.error(res, {
      status: 500,
      errors: [
        {
          key: "INTERNAL_SERVER_ERROR",
          message: "Terjadi kesalahan saat menghapus IoT device",
        },
      ],
    });
  }
}
