import type { ROLE, USER_STATUS } from "../../../generated/prisma/enums";

export interface IRegister {
  name: string;
  email: string;
  password: string;
  image?: string;
}

export interface ILogin {
  email: string;
  password: string;
}

export interface IChangePassword {
  currentPassword: string;
  newPassword: string;
}

export interface IUserUpdatePayload {
  name?: string;
  phone?: string;
  image?: string;
}

export interface IAdminUserUpdatePayload {
  name?: string;
  email?: string;
  phone?: string | null;
  image?: string | null;
  role?: ROLE;
  status?: USER_STATUS;
}
