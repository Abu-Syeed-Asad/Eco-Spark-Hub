import type { Prisma } from "../../../generated/prisma/client";

export const paymentSearcheblefields = [
  "id",
  "transactionId",
  "user.name",
  "user.email",
];

export const paymentFilterableFields = [
  "id",
  "amount",
  "userId",
  "postId",
  "transactionId",
  "status",
];
export const paymentIncludeConfig: Partial<
  Record<
    keyof Prisma.PaymentInclude,
    Prisma.PaymentInclude[keyof Prisma.PaymentInclude]
  >
> = {
  user: true,
  post: {
    include: {
      category: true,
    },
  },
};
