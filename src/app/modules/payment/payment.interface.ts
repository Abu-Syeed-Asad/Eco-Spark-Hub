/* eslint-disable @typescript-eslint/no-explicit-any */

export interface IPaymentUpdate {
 amount?: number;
 transactionId?: string;
 stripeEventId?: string;
 status?: "PAID" | "UNPAID";
 invoiceUrl?: string;
 paymentGatewayData?: any;
 postId?: string;
 userId?: string;
 createdAt?: Date;
 updatedAt?: Date;
}
