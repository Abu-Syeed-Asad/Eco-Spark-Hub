import { catchAsync } from "../../shared/catchAsync";
import { commentService } from "./comment.service";
import { sendRespose } from "../../shared/sendRequest";
import { commentIdSchema, commentQuerySchema, createCommentSchema, updateCommentSchema } from "./comment.validation";
const createComment = catchAsync(async (req, res) => {
  const payload = createCommentSchema.parse(req.body);
  const data = await commentService.commentCreate({ ...payload, userId: req.user.userId });
  sendRespose(res, { httpStatusCode: 201, success: true, message: "Comment posted", data });
});
const commentShow = catchAsync(async (req, res) => {
  const { id, page, limit } = commentQuerySchema.parse(req.query);
  const data = await commentService.showComment(id, page, limit);
  sendRespose(res, { httpStatusCode: 200, success: true, message: "Comments retrieved", data });
});
const deleteComment = catchAsync(async (req, res) => {
  const id = commentIdSchema.parse(req.query.id);
  const data = await commentService.CommentDelete(id, req.user);
  sendRespose(res, { httpStatusCode: 200, success: true, message: "Comment deleted", data });
});
const updateComment = catchAsync(async (req, res) => {
  const id = commentIdSchema.parse(req.query.id);
  const payload = updateCommentSchema.parse(req.body);
  const data = await commentService.commentUpdate(id, req.user, payload);
  sendRespose(res, { httpStatusCode: 200, success: true, message: "Comment updated", data });
});
export const commentController = { createComment, commentShow, deleteComment, updateComment };
