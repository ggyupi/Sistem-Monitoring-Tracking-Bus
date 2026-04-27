import { Prisma } from "@/generated/prisma/client";
import { ApiErrorItem, ApiResponses } from "@/lib/api-response";
import { getSessionFromRequest, isAdminRole } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const listCardsQuerySchema = z.object({
  search: z.string().trim().optional(),
});

const createCardSchema = z.object({
  rfidTag: z.string().trim().min(1, "RFID Tag wajib diisi"),
  balance: z.number().min(0, "Saldo tidak boleh negatif").optional().default(0),
  isInside: z.boolean().optional().default(false),
  status: z
    .string()
    .trim()
    .min(1, "Status wajib diisi")
    .optional()
    .default("active"),
  userId: z.string().trim().min(1).optional().nullable(),
  lastBusId: z.string().trim().min(1).optional().nullable(),
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
    const parseQuery = listCardsQuerySchema.safeParse({
      search: req.query.search,
    });

    if (!parseQuery.success) {
      return ApiResponses.error(res, {
        status: 400,
        errors: getValidationErrors(parseQuery.error),
      });
    }

    const search = parseQuery.data.search?.trim();

    const [cards, users, buses] = await prisma.$transaction([
      prisma.card.findMany({
        where: search
          ? {
              OR: [
                {
                  rfidTag: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  user: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  user: {
                    email: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  lastBus: {
                    busCode: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  lastBus: {
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
        orderBy: {
          rfidTag: "asc",
        },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.bus.findMany({
        select: {
          id: true,
          busCode: true,
          plateNumber: true,
        },
        orderBy: {
          busCode: "asc",
        },
      }),
    ]);

    return ApiResponses.success(
      res,
      {
        cards,
        users,
        buses,
      },
      {
        meta: {
          total: cards.length,
        },
      },
    );
  }

  const parseBody = createCardSchema.safeParse(req.body);

  if (!parseBody.success) {
    return ApiResponses.error(res, {
      status: 400,
      errors: getValidationErrors(parseBody.error),
    });
  }

  const payload = parseBody.data;

  if (payload.isInside && !payload.lastBusId) {
    return ApiResponses.error(res, {
      status: 400,
      errors: [
        {
          key: "VALIDATION_ERROR",
          field: "lastBusId",
          message:
            "lastBusId wajib diisi saat kartu berstatus berada di dalam bus",
        },
      ],
    });
  }

  if (payload.userId) {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
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
    const bus = await prisma.bus.findUnique({
      where: { id: payload.lastBusId },
    });
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
    const card = await prisma.card.create({
      data: {
        rfidTag: payload.rfidTag,
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

    return ApiResponses.success(res, card, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return ApiResponses.error(res, {
        status: 409,
        errors: [
          {
            key: "CONFLICT",
            field: "rfidTag",
            message: "RFID Tag sudah terdaftar",
          },
        ],
      });
    }

    return ApiResponses.error(res, {
      status: 500,
      errors: [
        {
          key: "INTERNAL_SERVER_ERROR",
          message: "Terjadi kesalahan saat membuat kartu RFID",
        },
      ],
    });
  }
}
