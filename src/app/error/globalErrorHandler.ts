
import type { NextFunction, Request, Response } from "express";
import { envVars } from "../config/env.config";
import status from "http-status";
import { AppError } from "./errorHelpler/AppError";
import type { TErrorResponse, TErrorSources } from "../interface/error.interface";

export const globalsErrorHandler = async(err:any,req:Request,res:Response,next:NextFunction) => {
  if (envVars.NODE_ENV === 'development') {
    console.log(`Error from global Error Handler >==>> `,err)
  };

  let errorSources: TErrorSources[] = [];
  let statusCode: number = status.INTERNAL_SERVER_ERROR;
  let message: string = "internal server Error";
  let stack: string | undefined = undefined;

  if (err instanceof AppError) {
    statusCode = err.httpStatusCode;
    message = err.message;
    stack = err.stack;
    errorSources=[
      {
        path: '',
        message:err.message
     }
    ]
  }
  else if (err instanceof Error) {
    statusCode = status.INTERNAL_SERVER_ERROR;
    message = err.message;
    stack = err.stack;
    errorSources = [
      {
        path: '',
        message:err.message
      }
    ]
  }
  const errorRespose:TErrorResponse= {
    success: false,
    message: message,
    errorSources,
    error: envVars.NODE_ENV === "development" ? err : undefined,
    stack: envVars.NODE_ENV === "development" ? stack : undefined,
  }
  res.status(statusCode).json(errorRespose )
} 