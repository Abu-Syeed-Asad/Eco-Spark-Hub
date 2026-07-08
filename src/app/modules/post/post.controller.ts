
import type { Request, Response } from "express";
import { postService } from "./post.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendRespose } from "../../shared/sendRequest";
import status from "http-status";
import type { IQueryParams } from "../../interface/queryBuilder.interface";
import type { POST_STATUS } from "../../../generated/prisma/enums";
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
    data: result,
  });
});
const getallPost = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;
  const result = await postService.getAllPost(query as IQueryParams);
  sendRespose(res, {
    success: true,
    httpStatusCode: status.OK,
    message: "all post ",
    data: result.data,
    meta:result.meta,
  });
});
const updatePost = catchAsync(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    photo: req.file?.path || req.file?.filename || req.body.photo,
  };
  const { id } = req.params;
  console.log(id);
  const result = await postService.updatePost(payload, id as string);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "successfuly post updated",
    data: result,
  });
});
const deletePost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user=req.user
  console.log(id);
  const result = await postService.deletePost(id as string,user);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "successfuly post deleted",
    data: result,
  });
});
const specificPost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  const result = await postService.specificPost(id as string, user);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "successfuly get a post ",
    data: result,
  });
});
const dashbordPost = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await postService.DashboardPost(user);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "dashBoard data",
    data: result,
  });
});
const postUpdateByadmin = catchAsync(async (req: Request, res: Response) => {
  const { postId, post_status } = req.query;
  const updateStatus = await postService.postUpdateByadmin(
    postId as string,
    post_status as POST_STATUS
  );

  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "successfully updated post status",
    data: updateStatus,
  });
});
export const postController = {
  createPost,
  getallPost,
  updatePost,
  deletePost,
  specificPost,
  dashbordPost,
  postUpdateByadmin,
};
