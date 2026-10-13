import { notificationRouter } from "../modules/notification/notification.route";
import { Router } from "express";
import { categoryRouter } from "../modules/category/category.route";
import { postRouter } from "../modules/post/post.route";
import { authRouter } from "../modules/auth/auth.route";
import { commentRouter } from "../modules/comment/comment.route";
import { paymentRoute } from "../modules/payment/payment.routes";

const router = Router();
router.use("/notifications", notificationRouter);

router.use("/category", categoryRouter);
router.use("/post", postRouter);
router.use("/auth", authRouter);
router.use("/payment",paymentRoute)
router.use("/comment", commentRouter);

export const index_Router: Router = router;
