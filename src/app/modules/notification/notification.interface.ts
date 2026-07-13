import type { NOTIFICATION_TYPE } from "../../../generated/prisma/client";

export interface CreateNotificationPayload {
  recipientId: string;
  senderId?: string | null;
  title: string;
  message: string;
  type: NOTIFICATION_TYPE;
  entityId?: string | null;
  entityType?: string | null;
}
