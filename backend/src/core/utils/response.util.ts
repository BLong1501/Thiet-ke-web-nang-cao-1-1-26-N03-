import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: any;
  errors?: any;
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number = 200,
  message: string = "Thành công",
  data?: T,
  meta?: any
): Response => {
  const responsePayload: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta !== undefined && { meta }),
  };

  return res.status(statusCode).json(responsePayload);
};

export const sendCreated = <T>(
  res: Response,
  message: string = "Tạo thành công",
  data?: T,
  meta?: any
): Response => {
  return sendSuccess(res, 201, message, data, meta);
};

export const sendError = (
  res: Response,
  statusCode: number = 400,
  message: string = "Đã có lỗi xảy ra",
  errors?: any
): Response => {
  const responsePayload: ApiResponse = {
    success: false,
    message,
    ...(errors !== undefined && { errors }),
  };

  return res.status(statusCode).json(responsePayload);
};
