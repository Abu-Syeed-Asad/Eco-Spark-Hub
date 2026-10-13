import status from "http-status";
import { prisma } from "../../lib/prisma"
import type { Icategory } from "./category.interface"
import { AppError } from "../../error/errorHelpler/AppError";


const createCategory = async (payload:Icategory) => {
  return prisma.category.create({
    data: payload
  });
}
const showAllcategory = async () => {
  const allCagegory = await prisma.category.findMany({
    orderBy: { title: "asc" },
  });
  return allCagegory;
}
const showCategoryById = async (categoryId: string) => {
  const isExistCategory = await prisma.category.findUnique({
    where: { id: categoryId },
  }); 
  if(!isExistCategory){
    throw new AppError(status.NOT_FOUND, "Category not found");
  }
  return isExistCategory;
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
    include: { _count: { select: { post: true } } },
  });
  if(!isExistCategory){
    throw new AppError(status.NOT_FOUND, "Category not found");
  }
  if (isExistCategory._count.post > 0) {
    throw new AppError(
      status.CONFLICT,
      "Category cannot be deleted while posts are assigned to it",
    );
  }
  return prisma.category.delete({
    where: {  id: categoryId },
  });
}     







export const categoryService = {
  createCategory,
  showAllcategory,
  showCategoryById,
  categoryUpdate,
  categoryDelete
}