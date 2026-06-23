import z from "zod";

export const createCategoryZodSchema = z.object({
  title:z.string("Title is Required")
})