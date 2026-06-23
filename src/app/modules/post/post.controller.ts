/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response } from "express";
import { postService } from "./post.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendRespose } from "../../shared/sendRequest";
import status from "http-status";



const createPost = catchAsync(async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const result = await postService.createPost(payload);
    sendRespose(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "success fully post created",
      data:result
    });
  } catch (error:any) {
    sendRespose(res, {
      httpStatusCode:404,
      success: false,
      message: "post create failed",
      
    })
    throw new Error("post create failed ",{cause:error})
  }
})


export const postController = {
  createPost
}