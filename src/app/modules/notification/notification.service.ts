import { prisma } from "../../lib/prisma";
import { getIO } from "../../socket/socket";
import type { CreateNotificationPayload } from "./notification.interface";


const createNotification = async (payload: CreateNotificationPayload) => {
  const notification = await prisma.notification.create({
    data: payload,
    include: {
      sender: true,
    },
  });

  const io = getIO();

  io.to(payload.recipientId).emit("notification:new", notification);

  return notification;
};

const getMyNotifications = async (userId: string) => {
  return prisma.notification.findMany({
    where: {
      recipientId: userId,
    },

    include: {
      sender: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

const markAsRead = async (notificationId: string) => {
  return prisma.notification.update({
    where: {
      id: notificationId,
    },

    data: {
      isRead: true,
    },
  });
};

const unreadCount = async (userId: string) => {
  return prisma.notification.count({
    where: {
      recipientId: userId,
      isRead: false,
    },
  });
};

export const NotificationService = {
  createNotification,
  getMyNotifications,
  markAsRead,
  unreadCount,
};
