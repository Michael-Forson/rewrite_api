// middlewares/zodValidationMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validateRequestWithZod =
  (schema: z.Schema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const parseResult = schema.safeParse(req.body);

    if (!parseResult.success) {
      const formattedErrors = parseResult.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));

      res.status(400).json({
        message: "Validation failed",
        errors: formattedErrors,
      });
      return;
    }

    // ✅ Data is valid and typed
    req.body = parseResult.data;
    next();
  };
