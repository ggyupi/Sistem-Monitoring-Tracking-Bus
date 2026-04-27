import { NextApiResponse } from "next";

export type ApiErrorItem = {
  key?: string;
  field?: string;
  message: string;
};

export type ApiMeta = {
  [key: string]: unknown;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
  meta?: ApiMeta;
  errors?: undefined;
};

export type ApiErrorResponse = {
  success: false;
  data: null;
  message?: string;
  meta?: ApiMeta;
  errors: ApiErrorItem[];
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiResponses {
  static success<T>(
    res: NextApiResponse<ApiResponse<T>>,
    data: T,
    options?: {
      status?: number;
      message?: string;
      meta?: ApiMeta;
    },
  ) {
    const status = options?.status ?? 200;
    return res.status(status).json({
      success: true,
      data,
      message: options?.message,
      meta: options?.meta,
    });
  }

  static error(
    res: NextApiResponse<ApiResponse<never>>,
    options: {
      status: number;
      message?: string;
      errors: ApiErrorItem[];
      meta?: ApiMeta;
    },
  ) {
    return res.status(options.status).json({
      success: false,
      data: null,
      message: options.message,
      meta: options.meta,
      errors: options.errors,
    });
  }
}
