
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

const createToken = (
  payload: JwtPayload,
  secret: string,
  expiresIn?: SignOptions["expiresIn"],
) => {
  const options: SignOptions = {};
  if (expiresIn !== undefined) {
    options.expiresIn = expiresIn;
  }
  const token = jwt.sign(payload, secret, options);
  return token;
};

const decodeToken = (token:string) => {
  const decode = jwt.decode(token) as JwtPayload;
  return decode
}

const verifyToken = (token:string,secceret:string) => {
  const TokenVerify = jwt.verify(token, secceret) as JwtPayload;
  return TokenVerify;
  
}

export const jwtUtils = {
  createToken,
  decodeToken,
  verifyToken
}