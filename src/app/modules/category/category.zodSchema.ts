import z from "zod";

const titleSchema = z
  .string("Title is required")
  .trim()
  .min(1, "Title is required")
  .max(80, "Title must be 80 characters or fewer");

export const createCategoryZodSchema = z.object({
  title: titleSchema,
});

export const updateCategoryZodSchema = z.object({
  title: titleSchema,
}).refine((category) => Object.keys(category).length > 0, {
  message: "Provide a category title to update",
});