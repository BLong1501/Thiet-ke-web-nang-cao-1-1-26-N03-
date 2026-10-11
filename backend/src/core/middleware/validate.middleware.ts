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
          const parsedQuery = await composite.query.parseAsync(req.query);
          try {
            req.query = parsedQuery as any;
          } catch {
            Object.defineProperty(req, "query", {
              value: parsedQuery,
              writable: true,
              configurable: true,
              enumerable: true,
            });
          }
        }
        if (composite.params) {
          const parsedParams = await composite.params.parseAsync(req.params);
          try {
            req.params = parsedParams as any;
          } catch {
            Object.defineProperty(req, "params", {
              value: parsedParams,
              writable: true,
              configurable: true,
              enumerable: true,
            });
          }
        }
      }
      return next();

    } catch (error: any) {
      if (error instanceof ZodError || error?.name === "ZodError" || Array.isArray(error?.issues)) {
        const formattedErrors = error.issues.map((err: any) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        return sendError(res, 400, "Dữ liệu gửi lên không hợp lệ", formattedErrors);
      }
      console.error("[VALIDATE MIDDLEWARE ERROR]:", error);
      return sendError(res, 500, error?.message || "Lỗi kiểm thực dữ liệu");
    }
  };
};


export const validate = validateRequest;
