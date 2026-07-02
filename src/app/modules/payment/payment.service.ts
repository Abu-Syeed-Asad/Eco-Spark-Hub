/* eslint-disable @typescript-eslint/no-explicit-any */
import type Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import {
  PAYMENT_STATUS,
  STRIPE_PAYMENT_STATUS,
} from "../../../generated/prisma/enums";
import { generateInvoicePdf } from "./payment.utils";
import { uploadFileToCloudinary } from "../../config/cloudinary.config";
import { sendEmail } from "../../utils/emailSend";

const handleStripeWebhookEvent = async (event: Stripe.Event, email: string) => {
  const normalizedEmail = email?.trim() || "";
  const isUserExist = normalizedEmail
    ? await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
        },
      })
    : null;

  const existingPayment = await prisma.payment.findFirst({
    where: {
      stripeEventId: event.id,
    },
  });
  if (existingPayment) {
    console.log(`Event${event.id} already proceess`);
    return { message: `Event ${event.id} already process` };
  }
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const postId = session.metadata?.postId;
      const paymentId = session.metadata?.paymentId;
      if (!postId || !paymentId) {
        console.error("⚠️ Missing metadata in webhook event");
        return { message: "Missing metadata" };
      }
      //verify post exist kore kina
      const postExist = await prisma.post.findFirst({
        where: {
          id: postId,
        },
        include: {
          user: true,
          payment: true,
        },
      });
      if (postExist?.paymentStatus === PAYMENT_STATUS.FREE) {
        return {
          message: `this post  status is Free `,
        };
      }

      let invoiceUrl = null;
      let pdfBuffer: Buffer | null = null;
      const payerEmail =
        normalizedEmail ||
        (typeof session.customer_details?.email === "string"
          ? session.customer_details.email
          : "") ||
        (typeof session.customer_email === "string"
          ? session.customer_email
          : "") ||
        postExist?.user?.email ||
        "";

      if (session.payment_status === "paid") {
        try {
          pdfBuffer = await generateInvoicePdf({
            invoiceId: postExist?.payment?.id || paymentId,
            amount: postExist?.taka || 0,
            transactionId: postExist?.payment?.transactionId || "",
            paymentDate: new Date().toISOString(),
            userName: isUserExist?.name as string,
            userEmail: payerEmail,
          });
          const pdflinkFromCloudinaryResponse = await uploadFileToCloudinary(
            pdfBuffer,
            `postPayment/invoices/${paymentId}-${Date.now()}.pdf`,
          );
          invoiceUrl = pdflinkFromCloudinaryResponse.url;
          console.log(invoiceUrl);
        } catch (error) {
          console.log(error);
        }
      }
      const updatePayment = await prisma.payment.update({
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
      if (session.payment_status === "paid" && invoiceUrl) {
        try {
          await sendEmail({
            to: payerEmail,
            subject: `post Title ${postExist?.title}`,
            templateName: "invoice",
            templateData: {
              invoiceId: updatePayment.postId,
              transactionId: updatePayment?.transactionId,
              invoiceUrl: invoiceUrl,
            },
            attachments: [
              {
                fileName: `invoice${paymentId}.pdf`,
                content: pdfBuffer || Buffer.from(""),
                contentType: "aplication/pdf",
              },
            ],
          });
          console.log(`✅ Invoice email sent to ${email}`);
        } catch (error) {
          console.log(error);
        }
      }
      console.log(
        `✅ Payment ${session.payment_status} for appointment ${updatePayment.postId}`,
      );
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object;

      console.log(
        `Checkout session ${session.id} expired. Marking associated payment as failed.`,
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
      console.log(`Unhandled event type ${event.type}`);
  }

  return { message: `Webhook Event ${event.id} processed successfully` };
};
export const PaymentService = {
  handleStripeWebhookEvent,
};
