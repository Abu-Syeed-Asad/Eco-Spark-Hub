
import type { Request, Response } from "express";
import { categoryService } from "./category.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendRespose } from "../../shared/sendRequest";
import status from "http-status";

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await categoryService.createCategory(payload);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category created successfully",
    data: result,
  });
});
const showAllcategory = catchAsync(async (req: Request, res: Response) => {
  const allcategory = await categoryService.showAllcategory();
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,  
    message: "All category are here",
    data: allcategory,
  });
});
const showCategoryById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.query;
  const category = await categoryService.showCategoryById(id as string);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category found",
    data: category,
  });
}); 
const categoryUpdate = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.query;
  const payload = req.body; 
  const category = await categoryService.categoryUpdate(id as string, payload);
  sendRespose(res, {
    httpStatusCode: status.OK,  
    success: true,
    message: "Category updated successfully",
    data: category,
  });
} );
const categoryDelete = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.query;
  const category = await categoryService.categoryDelete(id as string);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Category deleted successfully",
    data: category,
  });
});   


export const categoryController = {
  createCategory,
  showAllcategory,
  showCategoryById,
  categoryUpdate,
  categoryDelete  
};
