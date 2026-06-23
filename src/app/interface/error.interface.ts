export interface TErrorSources {
  path: string;
  message: string;
}
export interface TErrorResponse {
  success: boolean;
  message: string;
  errorSources: TErrorSources[];
  stack?: string | undefined;
  error?: unknown;
}