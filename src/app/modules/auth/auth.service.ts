import status from "http-status";
import { AppError } from "../../error/errorHelpler/AppError";
import { auth } from "../../lib/auth";
import type { IChangePassword, ILogin, IRegister } from "./auth.interface";
import { prisma } from "../../lib/prisma";
import { tokenUtils } from "../../utils/token.utils";
import type { IRequestUser } from "../../interface/IrequestUser.interface";
import { USER_STATUS } from "../../../generated/prisma/enums";
import { jwtUtils } from "../../utils/jwt";
import { envVars } from "../../config/env.config";

const userRegistation = async (payload: IRegister) => {
  const data = await auth.api.signUpEmail({
    body: payload,
  });

  if (!data || !data.user) {
    throw new AppError(status.BAD_REQUEST, "user registration failed");
  }
  const accessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    name: data.user.name,
    email: data.user.email,
    role: data.user.role,
    status: data.user.status,
  });
  const refreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    name: data.user.name,
    email: data.user.email,
    role: data.user.role,
    status: data.user.status,
  });

  return {
    accessToken,
    refreshToken,
    ...data,
  };
};
const userLogin = async (payload: ILogin) => {
  const isExist = await prisma.user.findFirst({
    where: {
      email: payload.email,
    },
  });
  if (!isExist) {
    throw new AppError(status.NOT_FOUND, "User not found ");
  }
  if (isExist && !isExist.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "user not verified ");
  }
  const data = await auth.api.signInEmail({
    body: payload,
  });
  if (!data.user) {
    throw new AppError(status.BAD_REQUEST, "User Login failed");
  }
  const accessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    name: data.user.name,
    email: data.user.email,
    role: data.user.role,
    status: data.user.status,
  });
  const refreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    name: data.user.name,
    email: data.user.email,
    role: data.user.role,
    status: data.user.status,
  });

  return {
    accessToken,
    refreshToken,
    ...data,
  };
};
const getMe = async (payload: IRequestUser) => {
  const isExist = await prisma.user.findUnique({
    where: {
      id: payload.userId,
      email: payload.email,
    },
    include: {
      posts: true,
    },
  });
  if (!isExist) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }
  return isExist;
};
const verifiyEmail = async (email: string, otp: string) => {
  const result = await auth.api.verifyEmailOTP({
    body: {
      email,
      otp,
    },
  });
  if (result.status && !result.user.emailVerified) {
    await prisma.user.update({
      where: {
        email,
      },
      data: {
        emailVerified: true,
      },
    });
  }
  return result;
};
const changePassword = async (payload: IChangePassword, sessionToken: string) => {
  
  if (!sessionToken) {
    throw new AppError(status.UNAUTHORIZED, "No session token provided");
  }

  const authHeader = `Bearer ${sessionToken}`;

  const data = await auth.api.getSession({
    headers: new Headers({
      Authorization: authHeader,
    }),
  });

  if (!data) {
    throw new AppError(status.UNAUTHORIZED, "Invalid session token");
  }

  const { currentPassword, newPassword } = payload;
  const result = await auth.api.changePassword({
    body: {
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    },
    headers: new Headers({
      Authorization: authHeader,
    }),
  });
const accessToken = tokenUtils.getAccessToken({
  userId: data.user.id,
  name: data.user.name,
  email: data.user.email,
  role: data.user.role,
  status: data.user.status,
});
const refreshToken = tokenUtils.getRefreshToken({
  userId: data.user.id,
  name: data.user.name,
  email: data.user.email,
  role: data.user.role,
  status: data.user.status,
});

return {
  accessToken,
  refreshToken,
  ...result,
};

  
};
const forgetPassword = async (email: string) => {
  const isUserExist = await prisma.user.findUnique({
    where: {
      email
    }
  });
  if (!isUserExist) {
    throw new AppError(status.NOT_FOUND, "user not found ");
  };
  if (!isUserExist.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "Email not verify");
  };
  if (isUserExist.isDeleted || isUserExist.status === USER_STATUS.BLOCK || isUserExist.status ===  USER_STATUS.DELETE) {
    throw new AppError(status.UNAUTHORIZED, "user is delete or  blocked");
  };
  await auth.api.requestPasswordResetEmailOTP({
    body: {
      email,
    }
  })

}
const lotoutUser = async (sessionToken:string) => {
  const result = await auth.api.signOut({
    headers: new Headers({
      Authorization:`Bearer ${sessionToken}`
    })
  })
  return result;
}
const restPasswor =async (email: string, otp: string, newPassword: string)=>{
  const isUserExist = await prisma.user.findUnique({
    where: {
      email
    }
  });
  if (!isUserExist) {
    throw new AppError(status.NOT_FOUND, "user not found");
  };
      if (!isUserExist.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email not verified");
      }

      if (isUserExist.isDeleted || isUserExist.status === USER_STATUS.DELETE) {
        throw new AppError(status.NOT_FOUND, "User not found");
  };
  await auth.api.resetPasswordEmailOTP({
    body: {
      email,
      otp,
      password:newPassword
    }
  })
  if (isUserExist.needPasswordChange) {
    await prisma.user.update({
      where: {
        id: isUserExist.id,
      },
      data: {
        needPasswordChange: false
      }
    });
    await prisma.session.deleteMany({
      where: {
        userId:isUserExist.id,
      }
    })
}

}
const getNewToken = async (refresToken: string, sessionToken: string) => {
  const isSessionTokenExist = await prisma.session.findFirst({
    where: {
      token: sessionToken
    },
    include: {
      user: true
    }
  });

  if (!isSessionTokenExist) {
    throw new AppError(status.NOT_FOUND, "session not found ");
  };
  const data = jwtUtils.verifyToken(refresToken, envVars.REFRESH_TOKEN_SECRET);
  if (!data.success && data.error) {
    throw new AppError(status.NOT_FOUND, "token not found ")
  }


  const newAccessToken = tokenUtils.getAccessToken({
    userId: data.user?.id,
    role: data.role,
    name: data.name,
    email: data.email,
    status: data.status,
    isDeleted: data.isDeleted,
    emailVerified: data.emailVerified,
  });

  const newRefreshToken = tokenUtils.getRefreshToken({
    userId: data.userId,
    role: data.role,
    name: data.name,
    email: data.email,
    status: data.status,
    isDeleted: data.isDeleted,
    emailVerified: data.emailVerified,
  });

  const { token } = await prisma.session.update({
    where: {
      token: sessionToken
    },
    data: {
      token: sessionToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 60 * 24 * 1000),
      updatedAt: new Date(),
    }
  })

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    session_token: token,
  };

};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const googleLoginSuccess = async (session : Record<string, any>) =>{
    const accessToken = tokenUtils.getAccessToken({
        userId: session.user.id,
        role: session.user.role,
        name: session.user.name,
    });

    const refreshToken = tokenUtils.getRefreshToken({
        userId: session.user.id,
        role: session.user.role,
        name: session.user.name,
    });

    return {
        accessToken,
        refreshToken,
    }
}


export const authService = {
  userRegistation,
  userLogin,
  verifiyEmail,
  getMe,
  changePassword,
  lotoutUser,
  forgetPassword,
  restPasswor,
  getNewToken,
  googleLoginSuccess
};
