import { Router } from "express";
import { categoryRouter } from "../modules/category/category.route";
import { postRouter } from "../modules/post/post.route";
import { authRouter } from "../modules/auth/auth.route";
import { paymentController } from "../modules/payment/payment.controller";
import { commentRouter } from "../modules/comment/comment.route";

const router = Router()

router.use('/category', categoryRouter);
router.use('/post', postRouter)
router.use('/auth', authRouter)
router.get('/all-payment', paymentController.allPayment)
router.use('/comment', commentRouter)

export const index_Router: Router = router;