import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { Prisma } from "../../generated/prisma/client";
export const auth = betterAuth({
  database: prismaAdapter(Prisma, {
    provider: "postgresql", 
  }),
});
