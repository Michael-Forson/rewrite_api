// src/domains/authentication/middleware/auth.ts (adjust path as needed)
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import UserModel, { IUserDocument } from "../models/user.model";

const User = UserModel;

// Custom payload type for your JWT (extend if token includes more fields like iat/exp)
interface CustomJwtPayload extends JwtPayload {
  id: string; // Matches your user._id (string for ObjectId)
}

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
      // Type assertion fixes the 'id' error—decoded is now known to have 'id'
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as CustomJwtPayload;
      
      // No ?. needed now, but you can add for extra runtime safety
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        res.status(401);
        throw new Error("User not found");
      }
      
      req.user = user; // Safe with declaration merging
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