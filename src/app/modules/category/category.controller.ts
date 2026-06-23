
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

export const categoryController = {
  createCategory,
};
