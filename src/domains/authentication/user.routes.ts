import express, { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
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
  googleCallback,
  profile,
  handleRefreshToken,
  facebookAuth,
  facebookAuthMobile,
  googleCallbackMobile,
  handleRefreshTokenMobile,
} from "./user.controller";
import { authMiddleware, isAdmin } from "../../middleware/authMiddleware";

const router: Router = express.Router();

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
router.get("/all-users", getallUser);

// Google OAuth login route
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);
//web make sure the
// // Google OAuth callback route
// router.get(
//   "/google/callback",
//   passport.authenticate("google", {
//     failureRedirect: "/login",
//     session: false,
//   }),
//   googleCallback as express.RequestHandler
// );
// Google OAuth callback route
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  googleCallbackMobile as express.RequestHandler
);

// Protected profile route
router.get("/profile", authMiddleware, profile as express.RequestHandler);

// Facebook Authentication
router.get("/facebook", passport.authenticate("facebook"));

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/login",
    session: false,
  }),
  facebookAuth as express.RequestHandler
);

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

// Optional: Add route-level error handling
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Route error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default router;
