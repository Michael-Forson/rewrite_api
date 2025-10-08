import express, { Router, Request, Response, NextFunction } from "express";
import {
  createUser,
  loginUserCtrl,
  getallUser,
  getaUser,
  updateaUser,
  deleteaUser,
  blockUser,
  unblockUser,
  logout,
  handleRefreshToken,
  handleRefreshTokenMobile,
  continueWithGoogle,
} from "./user.controller";
import { authMiddleware, isAdmin } from "../../middleware/authMiddleware";
import jwt from "jsonwebtoken";
const router: Router = express.Router();
import UserModel, { IUserDocument } from "../../models/user.model";
const User = UserModel;
interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

// Type definitions for request parameters
interface UserParamsId {
  id: string;
}

interface RegisterBody {
  username: string;
  email: string;
  password: string;
  mobile?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

// Basic routes with typed request bodies
router.post<{}, any, RegisterBody>("/register", createUser);
router.post<{}, any, LoginBody>("/login", loginUserCtrl);
router.post("/continue-with-google", continueWithGoogle);
router.get("/all-users", getallUser);

// Token and authentication routes
router.get("/refresh", handleRefreshToken);
router.get("/logout", logout);

// User management routes with typed parameters
router.get("/:id", authMiddleware, isAdmin, getaUser);
router.put("/edit-user", authMiddleware, updateaUser);
router.delete("/:id", deleteaUser);

// Admin routes for blocking/unblocking users
router.put("/block-user/:id", authMiddleware, isAdmin, blockUser);
router.put("/unblock-user/:id", authMiddleware, isAdmin, unblockUser);

// // Optional: Add route-level error handling
// router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
//   console.error("Route error:", err);
//   res.status(500).json({ error: "Internal server error" });
// });

export default router;
