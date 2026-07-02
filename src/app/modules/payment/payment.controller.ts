import type { Request, Response } from "express";
import type Stripe from "stripe";
import { catchAsync } from "../../shared/catchAsync";
import { envVars } from "../../config/env.config";
import status from "http-status";
import { stripe } from "../../config/stripe.config";
import { PaymentService } from "./payment.service";
import { sendRespose } from "../../shared/sendRequest";

const getWebhookEmail = (event: Stripe.Event) => {
  const data = event.data.object as unknown;
  const record = (data as Record<string, unknown> | undefined) ?? {};
  const customerDetails = record.customer_details as
    | { email?: string | null }
    | undefined;
  const metadata = record.metadata as Record<string, unknown> | undefined;

  return (
    (typeof customerDetails?.email === "string" ? customerDetails.email : "") ||
    (typeof record.customer_email === "string" ? record.customer_email : "") ||
    (typeof metadata?.email === "string" ? metadata.email : "") ||
    ""
  );
};

const handleStripeWebhookEvent = catchAsync(
  async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;
    const webhookSeccret = envVars.STRIPE.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSeccret) {
      console.error("missing webhook secret or signature");
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Missing Stripe signature or webhook secret" });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSeccret,
      );
    } catch (error) {
      console.error("error processing stripe webhook ", error);
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Missing Stripe signature or webhook secret" });
    }

    try {
      const email = getWebhookEmail(event);
      const result = await PaymentService.handleStripeWebhookEvent(
        event,
        email,
      );

      sendRespose(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Stripe webhook event processed successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error handling Stripe webhook event:", error);
      sendRespose(res, {
        httpStatusCode: status.INTERNAL_SERVER_ERROR,
        success: false,
        message: "Error handling Stripe webhook event",
      });
    }
  },
);

export const paymentControler = {
  handleStripeWebhookEvent,
};
