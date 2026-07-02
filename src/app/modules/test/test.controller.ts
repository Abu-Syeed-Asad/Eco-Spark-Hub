import type { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { stripe } from "../../config/stripe.config";
import { envVars } from "../../config/env.config";



export const testPayment = catchAsync(async (req: Request, res: Response) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card',],
    
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: "bdt",
          product_data: {
            name:"pen"
          },
          unit_amount:1000,
        },
        quantity:2,
      }
    ],
    metadata: {
      postId: "993822489dfhsdjk",
      paymentId:'948nfynvsk98347'
    },
         success_url: `${envVars.FRONTEND_URL}/dashboard/payment/payment-success`,

            // cancel_url: `${envVars.FRONTEND_URL}/dashboard/payment/payment-failed`,
            cancel_url: `${envVars.FRONTEND_URL}/dashboard/appointments`,
  });
  res.send(session.url);
  console.log(session)

})