import type { Response } from "express";
import type { ISendRespose } from "../interface/sendResponse.interface";
export const sendRespose =<T> (res: Response, responseData:ISendRespose<T>) => {
  const { httpStatusCode, success, message, data,meta } = responseData;

  res.status(httpStatusCode).json({
    success,
    message,
    data,
    meta
    
  });
}