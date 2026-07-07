
import type { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { authService } from "./auth.service";
import { sendRespose } from "../../shared/sendRequest";
import status from "http-status";
import { tokenUtils } from "../../utils/token.utils";
import { AppError } from "../../error/errorHelpler/AppError";
import { cookieUtils } from "../../utils/cookie.util";
import { envVars } from "../../config/env.config";
import { auth } from "../../lib/auth";

const userRegistation = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await authService.userRegistation(payload);
  tokenUtils.setAccessTokenInCookie(res, result.accessToken);
  tokenUtils.setRefreshTokenInCookie(res, result.refreshToken);
  tokenUtils.setSessionTokenInCookie(res, result.token as string);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "user creation successfully",
    data: result,
  });
});
const userLogin = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await authService.userLogin(payload);
  tokenUtils.setAccessTokenInCookie(res, result.accessToken);
  tokenUtils.setRefreshTokenInCookie(res, result.refreshToken);
  tokenUtils.setSessionTokenInCookie(res, result.token as string);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "user login successfully",
    data: result,
  });
});
const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new AppError(status.NOT_FOUND, "user note found here");
  };
  const userInfo =await authService.getMe(user);
  sendRespose(res, ({
    httpStatusCode: status.OK,
    success: true,
    message: "Here are User information",
    data:userInfo
  }))
})
const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await authService.verifiyEmail(email, otp);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "successfully email verified",
    data: result,
  });
});
const changePassword = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const sessionToken = req.cookies['session_token'];
  const result = await authService.changePassword(payload, sessionToken)
    tokenUtils.setAccessTokenInCookie(res, result.accessToken);
    tokenUtils.setRefreshTokenInCookie(res, result.refreshToken);
    tokenUtils.setSessionTokenInCookie(res, result.token as string);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "password change endpoint reached",
    data:result,
  });
});
const lotoutUser = catchAsync(async (req: Request, res: Response) => {
  const session = cookieUtils.getCookie(req, 'session_token');
  const result = await authService.lotoutUser(session);
  
  cookieUtils.cleareCookie(res, "session_token", {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  cookieUtils.cleareCookie(res, "access_token", {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  cookieUtils.cleareCookie(res, "refresh_token", {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });

  sendRespose(res, ({
    httpStatusCode: status.OK,
    success: true,
    message: "successfully log-out usr",
    data:result
  }))
})
const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  await authService.forgetPassword(email);
  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Password reset otp sent in your mail",
    
  })
});
const resetPassword = catchAsync(async (req: Request, res: Response) => {
  
  const {email,otp,newPassword} = req.body;
  await authService.restPasswor(email, otp, newPassword);
  sendRespose(res, {
    httpStatusCode: status.OK,
    message: "successfully reset password",
    success:true
  })
})
const userUpdate = catchAsync(async (req: Request, res: Response) => {
  
  const userInfo = req.body;
  const payload = req.body;
  const data= await authService.userUpdate(payload,userInfo);
  sendRespose(res, {
    httpStatusCode: status.OK,
    message: "successfully reset password",
    success: true,
    data
    
  })
})
const getNewToken = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token;
  const betterAuthSessionToken = req.cookies["session_token"];
  if (!refreshToken) {
    throw new AppError(status.UNAUTHORIZED, "Refresh token is missing");
  }
  const result = await authService.getNewToken(
    refreshToken,
    betterAuthSessionToken,
  );

  const { session_token, refresh_token, access_token } = result;

  tokenUtils.setAccessTokenInCookie(res, access_token);
  tokenUtils.setRefreshTokenInCookie(res, refresh_token);
  tokenUtils.setSessionTokenInCookie(res, session_token);

  sendRespose(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "New tokens generated successfully",
    data: {
      access_token,
      refreshToken: refresh_token,
      session_token,
    },
  });
});
// /api/v1/auth/login/google?redirect=/profile
const googleLogin = catchAsync((req: Request, res: Response) => {
    const redirectPath = req.query.redirect || "/dashboard";

    const encodedRedirectPath = encodeURIComponent(redirectPath as string);

    const callbackURL = `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success?redirect=${encodedRedirectPath}`;

    res.render("googleRedirect", {
        callbackURL : callbackURL,
        betterAuthUrl : envVars.BETTER_AUTH_URL,
    })
})

const googleLoginSuccess = catchAsync(async (req: Request, res: Response) => {
    const redirectPath = req.query.redirect as string || "/dashboard";

    const sessionToken = req.cookies["better-auth.session_token"];

    if(!sessionToken){
        return res.redirect(`${envVars.FRONTEND_URL}/login?error=oauth_failed`);
    }

    const session = await auth.api.getSession({
        headers:{
            "Cookie" : `better-auth.session_token=${sessionToken}`
        }
    })

    if (!session) {
        return res.redirect(`${envVars.FRONTEND_URL}/login?error=no_session_found`);
    }


    if(session && !session.user){
        return res.redirect(`${envVars.FRONTEND_URL}/login?error=no_user_found`);
    }

    const result = await authService.googleLoginSuccess(session);

    const {accessToken, refreshToken} = result;

    tokenUtils.setAccessTokenInCookie(res, accessToken);
    tokenUtils.setRefreshTokenInCookie(res, refreshToken);
 // ?redirect=//profile -> /profile
    const isValidRedirectPath = redirectPath.startsWith("/") && !redirectPath.startsWith("//");
    const finalRedirectPath = isValidRedirectPath ? redirectPath : "/dashboard";

    res.redirect(`${envVars.FRONTEND_URL}${finalRedirectPath}`);
})

const handleOAuthError = catchAsync((req: Request, res: Response) => {
    const error = req.query.error as string || "oauth_failed";
    res.redirect(`${envVars.FRONTEND_URL}/login?error=${error}`);
})
export const authController = {
  userLogin,
  userRegistation,
  verifyEmail,
  changePassword,
  getMe,
  lotoutUser,
  forgetPassword,
  resetPassword,
  getNewToken,
  googleLogin,
  googleLoginSuccess,
  handleOAuthError,
  userUpdate,
  

};
