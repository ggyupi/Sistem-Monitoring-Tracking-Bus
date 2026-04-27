import { TransactionType } from "@/generated/prisma/client";
import { ApiResponses } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const PRICE = 2500;

class TapTransactionError extends Error {
  status: number;
  key: string;
  field?: string;
  meta?: Record<string, unknown>;

  constructor(
    status: number,
    key: string,
    message: string,
    options?: {
      field?: string;
      meta?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.status = status;
    this.key = key;
    this.field = options?.field;
    this.meta = options?.meta;
  }
}

const schema = z.object({
  rfidTag: z.string(),
  busId: z.string(),
  deviceKey: z.string(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return ApiResponses.error(res, {
      message: "Method not allowed",
      errors: [
        { key: "METHOD_NOT_ALLOWED", message: "Only POST method is allowed" },
      ],
      status: 405,
    });
  }

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return ApiResponses.error(res, {
      status: 400,
      message: "Invalid request payload",
      errors: parsed.error.issues.map((issue) => ({
        key: "VALIDATION_ERROR",
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const payload = parsed.data;

  const card = await prisma.card.findUnique({
    where: {
      rfidTag: payload.rfidTag,
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!card) {
    return ApiResponses.error(res, {
      message: "Card not found",
      errors: [
        { key: "NOT_FOUND", field: "rfidTag", message: "Card not found" },
      ],
      status: 404,
    });
  }

  const verifySecret = await prisma.iotDevice.findUnique({
    where: {
      deviceKeyHash: payload.deviceKey,
    },
    include: {
      currentBus: true,
    },
  });

  if (!verifySecret) {
    return ApiResponses.error(res, {
      message: "Invalid device key",
      errors: [
        {
          key: "UNAUTHORIZED",
          field: "deviceKey",
          message: "Invalid device key",
        },
      ],
      status: 401,
    });
  }

  if (verifySecret.currentBus?.id !== payload.busId) {
    return ApiResponses.error(res, {
      message: "Device not associated with the specified bus",
      errors: [
        {
          key: "FORBIDDEN",
          field: "busId",
          message: "Device not associated with the specified bus",
        },
      ],
      status: 403,
    });
  }

  const isTapOut = card.isInside;
  const isTapIn = !isTapOut;

  if (isTapOut && card.lastBusId && card.lastBusId !== payload.busId) {
    return ApiResponses.error(res, {
      status: 409,
      message: "Tap out must be on the same bus",
      errors: [
        {
          key: "INVALID_TAP_OUT_BUS",
          field: "busId",
          message: "Card is currently inside a different bus",
        },
      ],
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const bus = await tx.bus.findUnique({
        where: {
          id: payload.busId,
        },
        select: {
          id: true,
          passengerCount: true,
          maxPassengers: true,
        },
      });

      if (!bus) {
        throw new TapTransactionError(404, "NOT_FOUND", "Bus not found", {
          field: "busId",
        });
      }

      if (isTapIn && bus.passengerCount >= bus.maxPassengers) {
        throw new TapTransactionError(409, "BUS_FULL", "Bus is full", {
          field: "busId",
          meta: {
            passengerCount: bus.passengerCount,
            maxPassengers: bus.maxPassengers,
          },
        });
      }

      if (isTapIn && card.balance < PRICE) {
        throw new TapTransactionError(
          409,
          "INSUFFICIENT_BALANCE",
          "Insufficient card balance",
          {
            field: "rfidTag",
            meta: {
              requiredAmount: PRICE,
              currentBalance: card.balance,
            },
          },
        );
      }

      const transaction = await tx.transaction.create({
        data: {
          rfidTag: payload.rfidTag,
          busId: payload.busId,
          type: isTapOut ? TransactionType.OUT : TransactionType.IN,
          amount: isTapOut ? 0 : PRICE,
          latTap: payload.latitude,
          lngTap: payload.longitude,
        },
      });

      const updatedCard = await tx.card.update({
        where: {
          id: card.id,
        },
        data: {
          isInside: isTapIn,
          lastBusId: isTapIn ? payload.busId : null,
          ...(isTapIn ? { balance: { decrement: PRICE } } : {}),
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      const nextPassengerCount = Math.max(
        0,
        bus.passengerCount + (isTapIn ? 1 : -1),
      );

      const updatedBus = await tx.bus.update({
        where: {
          id: payload.busId,
        },
        data: {
          passengerCount: nextPassengerCount,
        },
        select: {
          id: true,
          passengerCount: true,
        },
      });

      return {
        transaction,
        card: updatedCard,
        bus: updatedBus,
      };
    });

    return ApiResponses.success(
      res,
      {
        action: isTapOut ? "TAP_OUT" : "TAP_IN",
        transaction: result.transaction,
        card: {
          id: result.card.id,
          rfidTag: result.card.rfidTag,
          isInside: result.card.isInside,
          lastBusId: result.card.lastBusId,
          user: result.card.user
            ? {
                name: result.card.user.name,
              }
            : null,
        },
        bus: result.bus,
      },
      {
        status: 201,
        message: isTapOut ? "Tap out recorded" : "Tap in recorded",
      },
    );
  } catch (error) {
    if (error instanceof TapTransactionError) {
      return ApiResponses.error(res, {
        status: error.status,
        message: error.message,
        errors: [
          {
            key: error.key,
            field: error.field,
            message: error.message,
          },
        ],
        meta: error.meta,
      });
    }

    return ApiResponses.error(res, {
      status: 500,
      message: "Failed to process tap transaction",
      errors: [
        {
          key: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while processing tap transaction",
        },
      ],
    });
  }
}
