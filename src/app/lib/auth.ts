import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { ROLE, USER_STATUS } from "../../generated/prisma/client";
import { envVars } from "../config/env.config";
import { prisma } from "./prisma";
import { bearer, emailOTP } from "better-auth/plugins";
import { AppError } from "../error/errorHelpler/AppError";
import status from "http-status";
import { sendEmail } from "../utils/emailSend";

export const auth = betterAuth({
  baseURL: envVars.BETTER_AUTH_URL,
  secret: envVars.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: ROLE.USER,
        required: true,
      },
      status: {
        type: "string",
        defaultValue: USER_STATUS.ACTIVE,
        required: true,
      },
      phone: {
        type: "string",
        required: false,
      },
      needPasswordChange: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      isDeleted: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      deletedAt: {
        type: "date",
        required: false,
        defaultValue: null,
      },
    },
  },
  socialProviders: {
    google: {
      clientId: envVars.GOOGLE_CLIENT_ID as string,
      clientSecret: envVars.GOOGLE_CLIENT_SECRET as string,
      mapProfileToUser: () => {
        return {
          role: ROLE.USER,
          status: USER_STATUS.ACTIVE,
          neddPasswordChange: false,
          emailVerified: true,
          isDeleted: false,
          deletedAt: null,
        };
      },
    },
  },
  emailVerification: {
    sendOnSignIn: true,
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },

  advanced: {
    useSecureCookies: false, // cookie does non send  without cookie
    cookies: {
      status: {
        attributes: {
          sameSite: "none",
          secure: true,
          httpOnly: true,
          path: "/",
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dayes login thak be\
    updateAge: 60 * 60 * 24 * 7,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7,
    },
  },

  plugins: [
    bearer(),
    emailOTP({
      overrideDefaultEmailVerification: true,

      async sendVerificationOTP({ email, otp, type }) {
        if (type === "email-verification") {
          const user = await prisma.user.findUnique({
            where: {
              email,
            },
          });
          if (!user) {
            throw new AppError(
              status.NOT_FOUND,
              "your email does not exist here please provide right email",
            );
          }
          if (user && user.role === ROLE.ADMIN) {
            console.log("you are admin you dont need to verify your account ");
            return;
          }
          if (user && !user.emailVerified) {
            await sendEmail({
              to: email,
              subject: "verify your Email",
              templateName: "otp",
              templateData: {
                name: user.name,
                otp,
              },
            });
          }
        } else if (type === "forget-password") {
          const user = await prisma.user.findUnique({
            where: {
              email,
            },
          });
          if (user) {
            await sendEmail({
              to: email,
              subject: "password Reset otp",
              templateName: "otp",
              templateData: {
                name: user.name,
                otp,
              },
            });
          }
        }  else if (type === "change-email") {
          const user = await prisma.user.findUnique({
            where: {
              email,
            },
          });
          if (user) {
            await sendEmail({
              to: email,
              subject: "password Reset otp",
              templateName: "otp",
              templateData: {
                name: user.name,
                otp,
              },
            });
          }
        } 
      },

      sendVerificationOnSignUp: true,
      expiresIn: 2 * 60,
      otpLength: 6,
    }),
  ],

  trustedOrigins: [
    envVars.BETTER_AUTH_URL || "http://localhost:5000",
    envVars.FRONTEND_URL,
  ],
  redirectURLs: {
    signIn: `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success`,
  },
});
