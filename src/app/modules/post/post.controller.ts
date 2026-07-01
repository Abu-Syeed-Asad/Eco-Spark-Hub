
import type { Request, Response } from "express";
import { postService } from "./post.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendRespose } from "../../shared/sendRequest";
import status from "http-status";
import type { IQueryParams } from "../../interface/queryBuilder.interface";



const createPost = catchAsync(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    photo: req.file?.path || req.file?.filename || req.body.photo,
  };
  const result = await postService.createPost(payload);
  sendRespose(res, {
    httpStatusCode: status.OK,
    message: "success fully post created",
    success: true,
    data:result
  })
})
const getalPost = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;
  const result = await postService.getAllPost(query as IQueryParams);
  sendRespose(res, {
    success: true,
    httpStatusCode: status.OK,
    message: 'all post ',
    data: result
  })
})
const updatePost = catchAsync(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    photo: req.file?.path || req.file?.filename || req.body.photo,
  };
  const { id } = req.params;
  console.log(id)
  const result = await postService.updatePost(payload, id as string)
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'successfuly post updated',
    data:result
  })
})
const deletePost = catchAsync(async (req:Request, res:Response) => {
  const { id } = req.params;
  console.log(id)
  const result = await postService.deletePost(id as string);
    sendRespose(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "successfuly post deleted",
      data: result,
    });
})
const specificPost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await postService.specificPost(id as string);
    sendRespose(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "successfuly get a post ",
      data: result,
    });
})
export const postController = {
  createPost,
  getalPost,
  updatePost,
  deletePost,
  specificPost
};