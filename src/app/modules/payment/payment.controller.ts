

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { stripe } from "../../config/stripe.config";
import { envVars } from "../../config/env.config";
import { paymentService } from "./payment.service";
import { sendRespose } from "../../shared/sendRequest";
import status from "http-status";
import type { IQueryParams } from "../../interface/queryBuilder.interface";


const handleStripeEvent = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature as string,
      envVars.STRIPE.STRIPE_WEBHOOK_SECRET,
    );
    const user = req.user;
    const data = await paymentService.paymentHandler(event, user);
    sendRespose(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "payment success",
      data,
    });
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
const allPayment = catchAsync(async (req: Request, res: Response) => {
  const query = req.query
  const result = await paymentService.allPayment(query as IQueryParams);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: 'all payment information',
    data:result
  })
})
const specificPaymentByAdmin = catchAsync(async (req: Request, res: Response) => {
 
  const  {transectionId} = req.params
  
  const result = await paymentService.specificPayment(transectionId as string);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "All payment information",
    data:result,
  })
})
const complitedAllPayment = catchAsync(async(req:Request,res:Response)=> {
  const data = await paymentService.complitedAllPayment();
  sendRespose(res,{
    httpStatusCode: status.OK,
    success: true,
    message: "all complited Payment",
    data,
  })
})
const updatePayment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body;
  const data = await paymentService.updatePayment(id as string, payload);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "all complited Payment",
    data,
  })
});
const myAllPayment = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const data = await paymentService.myAllPayment(user);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "all Complited Payment",
    data
  })
})
const userSpecificPayment = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const {id} = req.params;
  const data = await paymentService.userSpecificPayment(id as string,user);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User Specific  Payment",
    data
  })
})

export const paymentController = {
  handleStripeEvent,
  allPayment,
  specificPaymentByAdmin,
  updatePayment,
  myAllPayment,
  userSpecificPayment,
  complitedAllPayment
};
