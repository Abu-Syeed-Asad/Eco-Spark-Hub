import type z from "zod";
import type { TErrorResponse, TErrorSources } from "../../interface/error.interface";
import status from "http-status";

export const handleZodError = (err:z.ZodError):TErrorResponse => {
  const statusCode = status.BAD_REQUEST;
  const message = "Zod validation Error";
  const errorSources: TErrorSources[] = [];
  if (err.issues) {
    err.issues.forEach((issue) => {
      errorSources.push({
        path: issue.path.join("=>"),
        message:issue.message
      })
    })
  }
  return {
    success:false,
    statusCode,
    message,
    errorSources,
  }
}