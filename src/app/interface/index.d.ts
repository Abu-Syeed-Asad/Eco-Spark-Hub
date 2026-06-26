import type { IRequestUser } from "./IrequestUser.interface";


declare global {
  namespace Express {
    interface Request {
      user: IRequestUser;
    }
  }
}
