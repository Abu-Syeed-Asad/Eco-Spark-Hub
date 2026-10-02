import { checkAuth } from "./../../middleware/checkAuth";
import { Router } from "express";
import { authController } from "./auth.controller";
import { ROLE } from "../../../generated/prisma/enums";
import { MulterUpload } from "../../config/multer.config";

const router = Router();

router.post("/register", authController.userRegistation);
router.post("/login", authController.userLogin);
router.post("/verify", authController.verifyEmail);
router.post("/resend", authController.resendVerify);
router.patch("/change-password", checkAuth(), authController.changePassword);
router.get("/all-user", checkAuth(ROLE.ADMIN), authController.allUser);
router.get("/me", checkAuth(), authController.getMe);
router.post("/log-out", authController.lotoutUser);

router.post("/forget-password", authController.forgetPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/get-new-token", authController.getNewToken);
router.get("/login/google", authController.googleLogin);
router.get("/google/login", authController.googleLogin);
router.get("/google/success", authController.googleLoginSuccess);
router.get("/oauth/error", authController.handleOAuthError);
router.patch(
  "/profile-update",
  MulterUpload.single("image"),
  checkAuth(),
  authController.userUpdate,
);

export const authRouter: Router = router;
