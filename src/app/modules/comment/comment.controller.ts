import { status } from 'http-status';
import type { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { commentService } from "./comment.service";
import { sendRespose } from "../../shared/sendRequest";


const createComment = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const payload = req.body;
  const result = await commentService.commentCreate({ ...payload, userId });
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "comment successfully created",
    data:result,
  })
})
const commentShow = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.query;
  console.log(id)
  const allComment = await commentService.showComment(id as string)
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Post related  all comment are here  ",
    data:allComment,
  })
})
const deleteComment = catchAsync (async (req: Request, res: Response) => {
  const { id } = req.query;
  console.log(id)
  const user = req.user;    
  const result = await commentService.CommentDelete(id as string, user);
  sendRespose(res, {
    httpStatusCode: status.OK,  
  success: true,
  message: "comment successfully deleted",
  data: result,
  });
})
const updateComment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.query;
  
  const user = req.user;  
  const payload = req.body;
  const result = await commentService.commentUpdate(id as string, user, payload);
  sendRespose(res, {  
    httpStatusCode: status.OK,
    success: true,
    message: "comment successfully updated",
    data: result,
  });
})



export const commentController ={
  createComment,
  commentShow,
  deleteComment,
  updateComment
  
}