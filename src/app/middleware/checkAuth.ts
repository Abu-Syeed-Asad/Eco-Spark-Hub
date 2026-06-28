import type { NextFunction, Request, Response } from "express";
import { cookieUtils } from "../utils/cookie.util";
import { AppError } from "../error/errorHelpler/AppError";
import status from "http-status";
import { prisma } from "../lib/prisma";
import { ROLE, USER_STATUS } from "../../generated/prisma/enums";
import { jwtUtils } from "../utils/jwt";
import { envVars } from "../config/env.config";

export const checkAuth =
  (...authRole: ROLE[]) =>

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = cookieUtils.getCookie(req, "session_token");
      if (!sessionToken) {
        throw new AppError(status.UNAUTHORIZED, "No session token provided");
      }
      if (sessionToken) {
        const sessionExists = await prisma.session.findFirst({
          where: {
            token: sessionToken,
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            user: true,
          },
        });
        if (sessionExists && sessionExists.user) {
          const user = sessionExists.user;
          const now = new Date();
          const expiresAt = new Date(sessionExists.expiresAt);
          const createAt = new Date(sessionExists.createdAt);
          const sessionlifetime = expiresAt.getTime() - createAt.getTime();
          const remainigTime = expiresAt.getTime() - now.getTime();
          const percentageRemaingTime = (remainigTime / sessionlifetime) * 100;
          if (percentageRemaingTime < 20) {
            res.setHeader("X-Session-Refresh", "true");
            res.setHeader("X-Session-Expires-At", expiresAt.toISOString());
            res.setHeader("X-Time-Remaining", remainigTime.toString());
          }
          if (
            user.status === USER_STATUS.BLOCK ||
            user.status === USER_STATUS.DELETE
          ) {
            throw new AppError(status.UNAUTHORIZED, "user not active");
          }
          if (user.isDeleted) {
            throw new AppError(status.UNAUTHORIZED, "user is deleted");
          }
          const userRole = user.role as unknown as ROLE;
          if (authRole.length > 0 && !authRole.includes(userRole)) {
            throw new AppError(status.FORBIDDEN, "Forbidden");
          }
          req.user = {
            userId: user.id,
            role: user.role,
            email: user.email,
          };
        }

        const accessToken = cookieUtils.getCookie(req, "access_token");
        if (!accessToken) {
          throw new AppError(status.UNAUTHORIZED, "no access token");
        }
        const verifyAccessToken = jwtUtils.verifyToken(
          accessToken,
          envVars.ACCESS_TOKEN_SECRET,
        );
        if (!verifyAccessToken) {
          throw new AppError(status.UNAUTHORIZED, "invalid access token ");
        }
        if (
          authRole.length > 0 &&
          !authRole.includes(verifyAccessToken.role as ROLE)
        ) {
          throw new AppError(
            status.FORBIDDEN,
            "your are not permited for this access",
          );
        }
        next();
      }
    } catch (error) {
      next(error);
    }
  };
