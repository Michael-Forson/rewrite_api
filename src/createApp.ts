import express from "express";
import dotenv from "dotenv";
import connectDB from "./core/db";
import passport from "passport";
import bodyParser from "body-parser";
import authRouter from "./domains/authentication/user.routes";
dotenv.config();
require("./domains/authentication/services/google_passport");
export function createApp() {
  const app = express();
  connectDB();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  app.use(passport.initialize());
  app.use("/api/v1/user", authRouter);
  return app;
}
