import type { CookieOptions, Request, Response } from "express";

const setcookie = (res: Response, key: string, token: string, option: CookieOptions) => {
  res.cookie(key, token, option);
};
const getCookie = (req: Request, key: string) => {
  return req.cookies[key];
};
const cleareCookie = (res:Response,key:string,option:CookieOptions) => {
  res.clearCookie(key, option)
}

export const cookieUtils = {
  setcookie,
  getCookie,
  cleareCookie
}