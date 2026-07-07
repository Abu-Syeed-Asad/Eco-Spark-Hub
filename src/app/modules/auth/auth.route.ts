import { checkAuth } from "./../../middleware/checkAuth";
import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

router.post("/register", authController.userRegistation);
router.post("/login", authController.userLogin);
router.post("/verify", authController.verifyEmail);
router.post("/change-password", checkAuth(), authController.changePassword);
router.post("/me",checkAuth(), authController.getMe);
router.post("/log-out", authController.lotoutUser);
router.post("/forget-password", authController.forgetPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/get-new-token", authController.getNewToken);
router.get("/login/google", authController.googleLogin);
router.get("/google/login", authController.googleLogin);
router.get("/google/success", authController.googleLoginSuccess);
router.get("/oauth/error", authController.handleOAuthError);

export const authRouter: Router = router;
