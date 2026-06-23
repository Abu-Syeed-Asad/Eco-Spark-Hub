export class AppError extends Error {
  public httpStatusCode: number;
  constructor(statusCode: number, message: string, stack = "") {
    super(message);
    this.httpStatusCode = statusCode;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this,this.constructor)
    }
  }
}
 