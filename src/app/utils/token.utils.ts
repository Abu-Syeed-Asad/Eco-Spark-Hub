import { jwtUtils } from "./jwt";
import { envVars } from "../config/env.config";
import type { JwtPayload } from "jsonwebtoken";
import type { Response } from "express";
import { cookieUtils } from "./cookie.util";

const getAccessToken = (payload: JwtPayload) => {
  const createAccessToken = jwtUtils.createToken(
    payload,
    envVars.ACCESS_TOKEN_SECRET,
    Number(envVars.ACCESS_TOKEN_EXPIRES_IN),
  );
  return createAccessToken;
};

const getRefreshToken = (payload: JwtPayload) => {
  const createRefreshToken = jwtUtils.createToken(
    payload,
    envVars.REFRESH_TOKEN_SECRET,
    Number(envVars.REFRESH_TOKEN_EXPIRES_IN),
  );
  return createRefreshToken;
};

const getCookieOptions = (): Record<string, unknown> => ({
  httpOnly: true,
  sameSite: "none",
  secure: envVars.NODE_ENV === "production",
  path: "/",
});

const setAccessTokenInCookie = (res: Response, token: string) => {
  cookieUtils.setcookie(res, "access_token", token, {
    ...getCookieOptions(),
    maxAge: 60 * 60 * 24 * 1000,
  });
};
const setRefreshTokenInCookie = (res: Response, token: string) => {
  cookieUtils.setcookie(res, "refresh_token", token, {
    ...getCookieOptions(),
    maxAge: 60 * 60 * 24 * 1000 * 7,
  });
};
const setSessionTokenInCookie = (res: Response, token: string) => {
  cookieUtils.setcookie(res, "session_token", token, {
    ...getCookieOptions(),
    maxAge: 60 * 60 * 24 * 1000,
  });
};

export const tokenUtils = {
  getAccessToken,
  getRefreshToken,
  setAccessTokenInCookie,
  setRefreshTokenInCookie,
  setSessionTokenInCookie,
};
