/* eslint-disable @typescript-eslint/no-unused-vars */
import { uploadFileToCloudinary } from "./../../config/cloudinary.config";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import {
  FINANCE_SOURCE,
  NOTIFICATION_TYPE,
  STRIPE_PAYMENT_STATUS,
} from "../../../generated/prisma/enums";
import { generateInvoicePdf } from "./payment.utils";
import type { IRequestUser } from "../../interface/IrequestUser.interface";
import { sendEmail } from "../../utils/emailSend";
import { AppError } from "../../error/errorHelpler/AppError";
import status from "http-status";
import type { IPaymentUpdate } from "./payment.interface";
import type { IQueryParams } from "../../interface/queryBuilder.interface";
import { type Payment, type Prisma } from "../../../generated/prisma/client";
import {
  paymentSearcheblefields,
  paymentFilterableFields,
  paymentIncludeConfig,
} from "./payment.constant";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { NotificationService } from "../notification/notification.service";

const paymentHandler = async (event: Stripe.Event) => {
  const existingPayment = await prisma.payment.findFirst({
    where: {
      stripeEventId: event.id,
    },
  });
  if (existingPayment) {
    console.log(`Event ${event.id} already Exist here so skiping`);
    return {
      message: `Event ${event.id} is already processed . `,
    };
  }
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const postId = session.metadata?.postId;
      const paymentId = session.metadata?.paymentId;
      const ownerId = session.metadata?.ownerId;
      const userId = session.metadata?.userId;
      const currentUser = await prisma.user.findFirst({
        where: {
          id: userId,
        },
      });
      if (!currentUser) {
        throw new AppError(status.NOT_FOUND, "user not found ");
      }
      const postOwner = await prisma.user.findFirst({
        where: {
          id: ownerId,
        },
      });
      if (!postOwner) {
        throw new AppError(status.NOT_FOUND, "user not found ");
      }

      if (!postId || !paymentId) {
        console.log(`Missing meta data `);
        return {
          message: "messing metadata",
        };
      }
      const isPostExist = await prisma.post.findFirst({
        where: {
          id: postId,
        },
      });
      if (!isPostExist) {
        console.error(
          ` post ${postId} not found. Payment may be for expired post.`,
        );
        return { message: "Post not found" };
      }
      const isPaymetExist = await prisma.payment.findUnique({
        where: {
          id: paymentId,
          postId: postId,
        },
        include: {
          user: true,
        },
      });
      if (!isPaymetExist) {
        return {
          message: `Paymen id ${paymentId} does not exist in payment data base`,
        };
      }

      const paymentOwner = isPaymetExist.user;
      const userName = paymentOwner?.name ?? currentUser?.email ?? "Customer";
      const userEmail = paymentOwner?.email ?? currentUser?.email ?? "";

      let invoiceUrl = null;
      let pdfBuffer: Buffer | null = null;

      if (session.payment_status === "paid") {
        try {
          pdfBuffer = await generateInvoicePdf({
            invoiceId: isPaymetExist.id || paymentId,
            userName,
            userEmail,
            amount: isPaymetExist.amount,
            paymentDate: new Date().toISOString(),
            transactionId: isPaymetExist.transactionId,
          });
          const cloudinaryResponse = await uploadFileToCloudinary(
            pdfBuffer,
            `postPayment/invoices/invoice-${paymentId}-${Date.now()}.pdf`,
          );
          invoiceUrl = cloudinaryResponse.secure_url;
        } catch (pdfError) {
          console.error(" Error generating/uploading invoice PDF:", pdfError);
        }
      }
      const paymentTx = await prisma.$transaction(async (tx) => {
        const paymentUpdateConfrom = await tx.payment.update({
          where: {
            id: paymentId,
          },
          data: {
            status:
              session.payment_status === "paid"
                ? STRIPE_PAYMENT_STATUS.PAID
                : STRIPE_PAYMENT_STATUS.UNPAID,
            paymentGatewayData: session,
            invoiceUrl: invoiceUrl,
            stripeEventId: event.id,
          },
        });
        const createFinanceLog = await tx.financeLog.create({
          data: {
            paymentId: paymentUpdateConfrom.id,
            financeSource: FINANCE_SOURCE.POST,
            userId: currentUser.id,
            ownerId:postOwner.id,
            amount: isPaymetExist.amount,
          },
        });

        const reduceTakaInUser = await tx.user.update({
          where: {
            id: currentUser.id,
          },
          data: {
            totalAmount: (Number(currentUser.totalAmount) -
              Number(isPaymetExist.amount)) as number,
          },
        });
        const IncriseTakaInOwner = await tx.user.update({
          where: {
            id: postOwner.id,
          },
          data: {
            totalAmount: (Number(postOwner.totalAmount) +
              Number(isPaymetExist.amount)) as number,
          },
        });

        return {
          paymentUpdateConfrom,
          createFinanceLog,
          reduceTakaInUser,
          IncriseTakaInOwner,
        };
      });

      if (session.payment_status === "paid" && invoiceUrl) {
        try {
          if (userEmail) {
            await sendEmail({
              to: userEmail,
              subject: `post payment conform ${paymentId}`,
              templateName: "invoice",
              templateData: {
                PostTitle: isPostExist.title,
                transection: isPaymetExist.transactionId,
                paymentDate: new Date().toISOString(),
                amount: isPaymetExist.amount,
                invoiceUrl: invoiceUrl,
              },
              attachments: [
                {
                  fileName: `invoice-${paymentId}.pdf`,
                  content: pdfBuffer || Buffer.from(""),
                  contentType: "Post/pdf",
                },
              ],
            });
            
          }
          return {
            invoiceUrl,
            paymentTx,
          };
        } catch (error) {
          console.log(error);
        }
      }
      if (session.payment_status === "paid") {
        await Promise.all([
          await NotificationService.createNotification({
            recipientId: currentUser.id,

            senderId: postOwner.id,

            title: "Payment Successful",

            message: `Your payment for "${isPostExist.title}" completed successfully.`,

            type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,

            entityId: paymentId,

            entityType: "PAYMENT",
          }),

          await NotificationService.createNotification({
            recipientId: postOwner.id,

            senderId: currentUser.id,

            title: "New Payment Received",

            message: `${currentUser.name} purchased your post "${isPostExist.title}".`,

            type: NOTIFICATION_TYPE.PAYMENT_SUCCESS,

            entityId: paymentId,

            entityType: "PAYMENT",
          }),
        ]);
      }
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object;
      console.log(
        `CheckOut sessoin ${session.id} expired marking associated payment as feld`,
      );
      break;
    }
    case "payment_intent.payment_failed": {
      const session = event.data.object;
      console.log(
        `Payment intent ${session.id} failed. Marking associated payment as failed.`,
      );
      break;
    }
    default:
      {
        console.log(`Unhandled event type ${event.type}`);
      }

      return { message: `Webhook Event ${event.id} processed successfully` };
  }
};
const allPayment = async (query: IQueryParams) => {
  const queryBuilder = new QueryBuilder<
    Payment,
    Prisma.PaymentWhereInput,
    Prisma.PaymentInclude
  >(prisma.payment, query, {
    searchableFields: paymentSearcheblefields,
    filterableFields: paymentFilterableFields,
  });
  const result = await queryBuilder
    .search()
    .filter()
    .where({ status: STRIPE_PAYMENT_STATUS.PAID })
    .include({
      user: true,
      post: {
        include: {
          category: true,
        },
      },
    })
    .dynamicInclude(paymentIncludeConfig)
    .pagination()
    .sort()
    .fields()
    .execute();

  // If result is a direct array of data:
  return result;
};

const specificPayment = async (transectionId: string) => {
  const data = await prisma.payment.findFirst({
    where: {
      transactionId: transectionId,
    },
    include: {
      user: true,
      post: true,
    },
  });
  if (!data) {
    throw new AppError(
      status.NOT_FOUND,
      `payment info not found in the database `,
    );
  }
  return data;
};
const updatePayment = async (
  transectionId: string,
  payload: IPaymentUpdate,
) => {
  const updatePayment = await prisma.payment.update({
    where: {
      transactionId: transectionId,
    },
    data: payload,
  });
  if (!updatePayment) {
    throw new AppError(
      status.NOT_FOUND,
      `failed to update payment info in the database `,
    );
  }
  return updatePayment;
};
const myAllPayment = async (user: IRequestUser) => {
  const { userId } = user;
  const allPayment = await prisma.payment.findMany({
    where: {
      userId,
    },
    include: {
      user: true,
      post: true,
    },
  });
  return allPayment;
};
const userSpecificPayment = async (id: string, user: IRequestUser) => {
  const { userId } = user;
  const specificPayment = await prisma.payment.findFirst({
    where: {
      userId,
      id,
    },
    include: {
      user: true,
      post: true,
    },
  });
  return specificPayment;
};
const complitedAllPayment = async () => {
  const allPayment = await prisma.payment.findMany();
};
export const paymentService = {
  paymentHandler,
  allPayment,
  specificPayment,
  updatePayment,
  myAllPayment,
  userSpecificPayment,
  complitedAllPayment,
};
