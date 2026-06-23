import type { Response } from "express";
interface IRespose<T> {
  httpStatusCode: number;
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    tatal: number;
    totalPages: number;
  };
}

export const sendRespose =<T> (res: Response, responseData:IRespose<T>) => {
  const { httpStatusCode, success, message, data,meta } = responseData;

  res.status(httpStatusCode).json({
    success,
    message,
    data,
    meta
    
  });

}