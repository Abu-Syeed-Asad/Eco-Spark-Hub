export interface ISendRespose<T> {
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