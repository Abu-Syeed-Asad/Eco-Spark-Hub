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
  pnone?: string;
  image?: string;
}
