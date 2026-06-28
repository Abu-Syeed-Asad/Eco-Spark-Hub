import { Router } from "express";
import { postController } from "./post.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { ROLE } from "../../../generated/prisma/enums";
import { zodSchemaRequestValidation } from "../../middleware/RequestZodvalidation";
import { postSchema } from "./post.zodvalidation";
import { MulterUpload } from "../../config/multer.config";

const router = Router()

router.post("/create", MulterUpload.single("photo"), checkAuth(ROLE.USER), zodSchemaRequestValidation(postSchema), postController.createPost);
router.get('/all-post', postController.getalPost)


export const postRouter: Router = router;