// src/domains/authentication/middleware/auth.ts (adjust path as needed)
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { JwtUser } from "../types/express";

export const authMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;
    if (req?.headers?.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401);
      throw new Error("No token attached to header");
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      req.user = decoded as JwtUser; // Safe with declaration merging
      next();
    } catch (error) {
      res.status(403);
      throw new Error("Not authorized, token expired—please login again");
    }
  }
);

export const isAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Direct access—no DB query needed, no assertion (with types in place)
    if (!req.user || req.user.role !== "admin") {
      res.status(403);
      throw new Error("You are not an admin");
    }
    next();
  }
);
