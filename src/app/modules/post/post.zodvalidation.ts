import z from "zod";

export const postSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Title must be at least 3 characters long" }),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters long" }),
  photo: z.string().optional(),
  paymentStatus: z.enum(["FREE", "PAID"]).default("FREE"),
  userId: z.string(),
  categoryId: z.string().ulid(),
});
