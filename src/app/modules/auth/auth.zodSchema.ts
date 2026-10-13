import z from "zod";

export const adminUserUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.email().trim().toLowerCase().optional(),
    phone: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    role: z.enum(["USER", "ADMIN"]).optional(),
    status: z.enum(["ACTIVE", "BLOCK", "DELETE"]).optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one user field must be provided",
  });