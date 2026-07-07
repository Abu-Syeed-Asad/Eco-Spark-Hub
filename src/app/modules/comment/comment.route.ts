import { Router } from "express";
import { commentController } from "./comment.controller";
import { checkAuth } from "../../middleware/checkAuth";

const router = Router();

router.post("/create-comment", checkAuth(), commentController.createComment);
router.get("/show", commentController.commentShow);
router.delete("/delete",checkAuth(), commentController.deleteComment);
router.patch("/update",checkAuth(), commentController.updateComment);

export const commentRouter: Router = router;
