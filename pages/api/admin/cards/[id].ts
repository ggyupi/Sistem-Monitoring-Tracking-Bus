import { Prisma } from "@/generated/prisma/client";
import { ApiErrorItem, ApiResponses } from "@/lib/api-response";
import { getSessionFromRequest, isAdminRole } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

const updateCardSchema = z
  .object({
    balance: z.number().min(0, "Saldo tidak boleh negatif").optional(),
    isInside: z.boolean().optional(),
    status: z.string().trim().min(1, "Status wajib diisi").optional(),
    userId: z.string().trim().min(1).optional().nullable(),
    lastBusId: z.string().trim().min(1).optional().nullable(),
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
  if (req.method !== "GET" && req.method !== "PATCH" && req.method !== "DELETE") {
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

  const cardId = parseParam.data.id;

  if (req.method === "GET") {
    const card = await prisma.card.findUnique({
      where: { rfidTag: cardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lastBus: {
          select: {
            id: true,
            busCode: true,
            plateNumber: true,
          },
        },
      },
    });

    if (!card) {
      return ApiResponses.error(res, {
        status: 404,
        errors: [{ key: "NOT_FOUND", message: "Kartu RFID tidak ditemukan" }],
      });
    }

    return ApiResponses.success(res, card);
  }

  if (req.method === "PATCH") {
    const parseBody = updateCardSchema.safeParse(req.body);

    if (!parseBody.success) {
      return ApiResponses.error(res, {
        status: 400,
        errors: getValidationErrors(parseBody.error),
      });
    }

    const payload = parseBody.data;

    if (payload.userId) {
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) {
        return ApiResponses.error(res, {
          status: 400,
          errors: [
            {
              key: "VALIDATION_ERROR",
              field: "userId",
              message: "User tidak ditemukan",
            },
          ],
        });
      }
    }

    if (payload.lastBusId) {
      const bus = await prisma.bus.findUnique({ where: { id: payload.lastBusId } });
      if (!bus) {
        return ApiResponses.error(res, {
          status: 400,
          errors: [
            {
              key: "VALIDATION_ERROR",
              field: "lastBusId",
              message: "Bus tidak ditemukan",
            },
          ],
        });
      }
    }

    try {
      const updatedCard = await prisma.card.update({
        where: { rfidTag: cardId },
        data: {
          balance: payload.balance,
          isInside: payload.isInside,
          status: payload.status,
          userId: payload.userId ?? undefined,
          lastBusId: payload.lastBusId ?? undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          lastBus: {
            select: {
              id: true,
              busCode: true,
              plateNumber: true,
            },
          },
        },
      });

      return ApiResponses.success(res, updatedCard);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return ApiResponses.error(res, {
          status: 404,
          errors: [{ key: "NOT_FOUND", message: "Kartu RFID tidak ditemukan" }],
        });
      }

      return ApiResponses.error(res, {
        status: 500,
        errors: [
          { key: "INTERNAL_SERVER_ERROR", message: "Terjadi kesalahan saat memperbarui kartu RFID" },
        ],
      });
    }
  }

  try {
    await prisma.card.delete({
      where: { rfidTag: cardId },
    });

    return ApiResponses.success(res, { rfidTag: cardId });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return ApiResponses.error(res, {
        status: 404,
        errors: [{ key: "NOT_FOUND", message: "Kartu RFID tidak ditemukan" }],
      });
    }

    return ApiResponses.error(res, {
      status: 500,
      errors: [
        { key: "INTERNAL_SERVER_ERROR", message: "Terjadi kesalahan saat menghapus kartu RFID" },
      ],
    });
  }
}
