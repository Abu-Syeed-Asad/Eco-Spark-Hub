/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import { prisma } from "../../lib/prisma"
import type { Icategory } from "./category.interface"
import { AppError } from "../../error/errorHelpler/AppError";


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
const showAllcategory = async () => {
  const allCagegory = await prisma.category.findMany();
  return allCagegory;
}
const showCategoryById = async (categoryId: string) => {
  const isExistCategory = await prisma.category.findUnique({
    where: { id: categoryId },
  }); 
  if(!isExistCategory){
    throw new AppError(status.NOT_FOUND, "Category not found");
  }
  const category = await prisma.category.findUnique({
    where: {  id: categoryId },
  });
  return category;
} 
const categoryUpdate = async (categoryId: string, payload: Icategory) => {
  const isExistCategory = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if(!isExistCategory){
    throw new AppError(status.NOT_FOUND, "Category not found");
  }
  const category = await prisma.category.update({
    where: {  id: categoryId },
    data: payload
  });
  return category;
} 
const categoryDelete = async (categoryId: string) => {
  const isExistCategory = await prisma.category.findUnique({
    where: { id: categoryId },
  }); 
  if(!isExistCategory){
    throw new AppError(status.NOT_FOUND, "Category not found");
  } 
  const category = await prisma.category.delete({
    where: {  id: categoryId },
  });
  return category;
}     







export const categoryService = {
  createCategory,
  showAllcategory,
  showCategoryById,
  categoryUpdate,
  categoryDelete
}