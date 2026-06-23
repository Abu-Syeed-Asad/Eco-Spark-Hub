import { Router } from "express";
import { categoryRouter } from "../modules/category/category.route";
import { postRouter } from "../modules/post/post.route";
const router = Router()

router.use('/category', categoryRouter);
router.use('/post',postRouter)

export const index_Router: Router = router;