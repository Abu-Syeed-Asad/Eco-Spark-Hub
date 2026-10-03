import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { ROLE } from "../../../generated/prisma/enums";
import { paymentController } from "./payment.controller";

const router = Router();
router.get("/all-payment", checkAuth(ROLE.ADMIN), paymentController.allPayment);
router.get("/my-payment", checkAuth(), paymentController.myAllPayment);

export const  paymentRoute:Router =router