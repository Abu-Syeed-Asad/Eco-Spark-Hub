/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma"
import type { Icategory } from "./category.interface"


const createCategory = async (payload:Icategory) => {
  try {
    const categoryResult = await prisma.category.create({
      data: payload
    });
    return categoryResult;
  } catch (error:any) {
    throw new Error("Failed to create category", { cause: error })
  }
}


export const categoryService = {
  createCategory
}