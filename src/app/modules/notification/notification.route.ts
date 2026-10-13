import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { catchAsync } from "../../shared/catchAsync";
import { sendRespose } from "../../shared/sendRequest";
import { AppError } from "../../error/errorHelpler/AppError";
import { NotificationService } from "./notification.service";
export const notificationRouter: Router = Router();
notificationRouter.use(checkAuth());
notificationRouter.get("/", catchAsync(async (req, res) => {
  const page = Number(req.query.page ?? 1), limit = Number(req.query.limit ?? 20);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new AppError(400, "Invalid pagination: page must be positive and limit between 1 and 100");
  const data = await NotificationService.getMyNotifications(req.user.userId, page, limit);
  sendRespose(res, { httpStatusCode: 200, success: true, message: "Notifications retrieved", data });
}));
notificationRouter.get("/unread-count", catchAsync(async (req, res) => {
  const count = await NotificationService.unreadCount(req.user.userId);
  sendRespose(res, { httpStatusCode: 200, success: true, message: "Unread count retrieved", data: { count } });
}));
notificationRouter.patch("/read-all", catchAsync(async (req, res) => {
  const data = await NotificationService.markAllAsRead(req.user.userId);
  sendRespose(res, { httpStatusCode: 200, success: true, message: "All notifications marked as read", data });
}));
notificationRouter.patch("/:id/read", catchAsync(async (req, res) => {
  const data = await NotificationService.markAsRead(String(req.params.id), req.user.userId);
  sendRespose(res, { httpStatusCode: 200, success: true, message: "Notification marked as read", data });
}));
