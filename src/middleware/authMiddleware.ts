import { NextFunction, Request, Response } from "express";
import  UserModel, { IUserDocument } from "../models/user.model";


const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const User = UserModel;


export const authMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;
    if (req?.headers?.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
      try {
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded?.id);
          req.user = user!;
          next();
        }
      } catch (error) {
        throw new Error("Not Authorized token expired, please Login again");
      }
    } else {
      throw new Error("There is no token attached to header");
    }
  }
);

export const isAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.user as IUserDocument;
    const adminUser = await User.findOne({ email });
    if (adminUser?.role !== "admin") {
      throw new Error("You are not an admin");
    } else {
      next();
    }
  }
);
// export default = { authMiddleware, isAdmin };
