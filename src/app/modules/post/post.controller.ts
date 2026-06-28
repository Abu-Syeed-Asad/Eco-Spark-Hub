import type { Request, Response } from "express";
import { postService } from "./post.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendRespose } from "../../shared/sendRequest";
import status from "http-status";



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
  const result = await postService.getAllPost();
  sendRespose(res, {
    success: true,
    httpStatusCode: status.OK,
    message: 'all post ',
    data: result
  })
})


export const postController = {
  createPost,
  getalPost,
}