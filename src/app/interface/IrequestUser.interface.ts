import type { ROLE } from "../../generated/prisma/enums";

export interface IRequestUser {
  email: string;
  role: ROLE;
  userId: string;
}
