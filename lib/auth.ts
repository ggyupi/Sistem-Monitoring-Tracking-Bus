import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:3000",
  trustedOrigins: (process.env.BETTER_AUTH_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim()),

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
      },
    },
  },
  emailAndPassword: { enabled: true },
});
