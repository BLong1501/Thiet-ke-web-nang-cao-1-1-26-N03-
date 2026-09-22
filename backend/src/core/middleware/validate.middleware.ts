import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { sendError } from "../utils/response.util";

interface RequestValidationSchema {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validateRequest = (schema: ZodSchema | RequestValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      if ("parse" in schema && typeof schema.parse === "function") {
        req.body = await schema.parseAsync(req.body);
      } else {
        const composite = schema as RequestValidationSchema;
        if (composite.body) {
          req.body = await composite.body.parseAsync(req.body);
        }
        if (composite.query) {
          req.query = (await composite.query.parseAsync(req.query)) as any;
        }
        if (composite.params) {
          req.params = (await composite.params.parseAsync(req.params)) as any;
        }
      }
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        return sendError(res, 400, "Dữ liệu gửi lên không hợp lệ", formattedErrors);
      }
      return sendError(res, 500, "Lỗi kiểm thực dữ liệu");
    }
  };
};

export const validate = validateRequest;
