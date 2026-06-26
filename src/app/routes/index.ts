import { Router } from "express";
import { categoryRouter } from "../modules/category/category.route";
import { postRouter } from "../modules/post/post.route";
import { authRouter } from "../modules/auth/auth.route";
const router = Router()

router.use('/category', categoryRouter);
router.use('/post', postRouter)
router.use('/auth',authRouter)

export const index_Router: Router = router;