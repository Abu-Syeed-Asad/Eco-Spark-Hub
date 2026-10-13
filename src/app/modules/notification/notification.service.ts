import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { getIO } from "../../socket/socket";
import { AppError } from "../../error/errorHelpler/AppError";
import type { CreateNotificationPayload } from "./notification.interface";
const sender = { select: { id: true, name: true, image: true } };
const persistNotification = async (payload: CreateNotificationPayload, db: Prisma.TransactionClient = prisma) => {
  if (payload.senderId === payload.recipientId) return null;
  const notification = await db.notification.create({ data: payload, include: { sender } });
  return notification;
};
const emitNotification = (notification: Awaited<ReturnType<typeof persistNotification>>) => {
  if (notification) getIO()?.to(notification.recipientId).emit("notification:new", notification);
};
const createNotification = async (payload: CreateNotificationPayload) => {
  const notification = await persistNotification(payload);
  emitNotification(notification);
  return notification;
};
const getMyNotifications = async (userId: string, page = 1, limit = 20) => {
  const where = { recipientId: userId };
  const [notifications, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({ where, include: { sender }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
  ]);
  return { notifications, unreadCount, page, totalPages: Math.ceil(total / limit), total };
};
const markAsRead = async (notificationId: string, userId: string) => {
  const result = await prisma.notification.updateMany({ where: { id: notificationId, recipientId: userId }, data: { isRead: true } });
  if (!result.count) throw new AppError(404, "Notification not found");
  return { id: notificationId, isRead: true };
};
const markAllAsRead = async (userId: string) => prisma.notification.updateMany({ where: { recipientId: userId, isRead: false }, data: { isRead: true } });
const unreadCount = async (userId: string) => prisma.notification.count({ where: { recipientId: userId, isRead: false } });
export const NotificationService = { persistNotification, emitNotification, createNotification, getMyNotifications, markAsRead, markAllAsRead, unreadCount };
