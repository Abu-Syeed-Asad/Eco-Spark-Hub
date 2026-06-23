import { Router } from "express";
import { postController } from "./post.controller";

const router = Router()

router.post("/create", postController.createPost)

export const postRouter: Router = router;