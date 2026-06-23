import type { NextFunction, Request, Response } from "express";
import type z from "zod";


export const zodSchemaRequestValidation = (zodSchema: z.ZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {

    if (req.body.data) {
      req.body = JSON.parse(req.body.data);
    };
    const validationRequestData = zodSchema.safeParse(req.body);
    if (!validationRequestData.success) {
      next(validationRequestData.error);
    }
    req.body = validationRequestData.data;
    next()
  }
}
