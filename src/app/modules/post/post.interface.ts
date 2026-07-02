import type {
  PAYMENT_STATUS,
  POST_STATUS,
} from "../../../generated/prisma/enums";

export interface IPostInterface {
  title: string;
  description: string;
  photo?: string;
  paymentStatus: PAYMENT_STATUS;
  status: POST_STATUS;
  userId: string;
  categoryId: string;
  taka: number;
}
export interface IIUpdatePostInterface {
  title?: string;
  description?: string;
  photo?: string;
  paymentStatus?: PAYMENT_STATUS;
  status?: POST_STATUS;
  userId?: string;
  categoryId?: string;
}
