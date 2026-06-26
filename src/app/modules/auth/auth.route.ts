import { checkAuth } from './../../middleware/checkAuth';
import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

router.post("/register", authController.userRegistation);
router.post("/login", authController.userLogin);
router.post("/verify", authController.verifyEmail);
router.post("/change-password",checkAuth(),authController.changePassword)
router.post("/me",authController.getMe)
router.post("/log-out",authController.lotoutUser)
router.post("/forget-password",authController.forgetPassword)
router.post("/reset-password",authController.resetPassword)
router.post("/get-new-token",authController.getNewToken)


export const authRouter: Router = router;
