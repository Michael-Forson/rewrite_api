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

// // Type definitions for request parameters
// interface UserParamsId {
//   id: string;
// }

// interface RegisterBody {
//   username: string;
//   email: string;
//   password: string;
//   mobile?: string;
// }

// interface LoginBody {
//   email: string;
//   password: string;
// }

// // Basic routes with typed request bodies
// router.post<{}, any, RegisterBody>("/register", createUser);
// router.post<{}, any, LoginBody>("/login", loginUserCtrl);
// router.get("/all-users", getallUser);

// // Google OAuth login route
// router.get(
//   "/google",
//   passport.authenticate("google", {
//     scope: ["profile", "email"],
//     session: false,
//   })
// );
// //web make sure the
// // // Google OAuth callback route
// // router.get(
// //   "/google/callback",
// //   passport.authenticate("google", {
// //     failureRedirect: "/login",
// //     session: false,
// //   }),
// //   googleCallback as express.RequestHandler
// // );
// // Google OAuth callback route
// router.get(
//   "/google",
//   passport.authenticate("google", {
//     scope: ["profile", "email"],
//     session: false,
//   })
// );
// router.get(
//   "/google/callback",
//   passport.authenticate("google", {
//     failureRedirect: "/login",
//     session: false,
//   }),
//   googleCallbackMobile as express.RequestHandler
// );

// // Protected profile route
// router.get("/profile", authMiddleware, profile as express.RequestHandler);

// // Facebook Authentication
// router.get("/facebook", passport.authenticate("facebook"));

// router.get(
//   "/facebook/callback",
//   passport.authenticate("facebook", {
//     failureRedirect: "/login",
//     session: false,
//   }),
//   facebookAuth as express.RequestHandler
// );

// // Token and authentication routes
// router.get("/refresh", handleRefreshToken);
// router.get("/logout", logout);

// // User management routes with typed parameters
// router.get("/:id", authMiddleware, isAdmin, getaUser);
// router.put("/edit-user", authMiddleware, updateaUser);
// router.delete("/:id", deleteaUser);

// // Admin routes for blocking/unblocking users
// router.put("/block-user/:id", authMiddleware, isAdmin, blockUser);
// router.put("/unblock-user/:id", authMiddleware, isAdmin, unblockUser);

// // Optional: Add route-level error handling
// router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
//   console.error("Route error:", err);
//   res.status(500).json({ error: "Internal server error" });
// });

// export default router;

// routes/router.ts
// import express, { Request, Response } from "express";
// import jwt from "jsonwebtoken";
import axios from "axios";
import mongoose from "mongoose";

// const router = express.Router();

// User model (you can move this to a separate models/user.ts file if preferred)
// interface IUser extends mongoose.Document {
//   googleId: string;
//   email: string;
//   name: string;
//   picture?: string;
// }

// const userSchema = new mongoose.Schema<IUser>({
//   googleId: { type: String, required: true },
//   email: { type: String, required: true },
//   name: { type: String, required: true },
//   picture: String,
// });

// const User = mongoose.model<IUser>("User", userSchema);

// Google token exchange endpoint
router.post("/google/callback", async (req: Request, res: Response) => {
  const { code, redirectUri } = req.body;

  if (!code || !redirectUri) {
    return res.status(400).json({ message: "Missing code or redirectUri" });
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }
    );

    // const { access_token, id_token, refresh_token } = tokenResponse.data;
    const { access_token }: any = tokenResponse.data;

    // Fetch user info (alternative: decode id_token with jsonwebtoken)
    const userInfoResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    const userInfo = userInfoResponse.data as GoogleUserInfo;

    // Find or create user in DB
    let user = await User.findOne({ googleId: userInfo.sub });
    if (!user) {
      user = new User({
        googleId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      });
      await user.save();
    }

    // Generate your app's JWT tokens
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" } // Short-lived access token
    );
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" } // Longer-lived refresh token
    );

    res.json({
      user: {
        id: user._id,
        email: user.email,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Google callback error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
});

// Logout endpoint (optional: revoke Google token or blacklist JWT)
router.post("/user/logout", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify JWT (optional, since logout is client-side driven)
    jwt.verify(token, process.env.JWT_SECRET as string);

    // Here, you could blacklist the token in Redis/DB if needed
    // Or revoke Google token if you stored it

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// Token refresh endpoint (add this for front-end refresh logic)
router.post("/user/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Missing refreshToken" });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_SECRET as string
    ) as { userId: string };
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newAccessToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

export default router;
