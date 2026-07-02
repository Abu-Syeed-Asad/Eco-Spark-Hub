import { Router } from "express";
import { categoryRouter } from "../modules/category/category.route";
import { postRouter } from "../modules/post/post.route";
import { authRouter } from "../modules/auth/auth.route";
import { testPayment } from "../modules/test/test.controller";
const router = Router()

router.use('/category', categoryRouter);
router.use('/post', postRouter)
router.use('/auth', authRouter)
router.get('/test',testPayment)


export const index_Router: Router = router;