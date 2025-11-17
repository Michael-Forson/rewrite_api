import express from "express";
import dotenv from "dotenv";
import connectDB from "./core/db";
import bodyParser from "body-parser";
import authRouter from "./domains/authentication/user.routes";
import onboardingRouter from "./domains/onboarding.tsx/onboarding.router";
import dailyCheckInRouter from "./domains/dailycheckIn/dailycheckIn.routes";
import milestoneRouter from "./domains/milestone/milestone.routes";
import analyticsRouter from "./domains/analytics/analytics.routes";
import copingStrategiesRouter from "./domains/copingStrategies/copingStrategies.route";
import copingUsageRouter from "./domains/copingUsage/copingUsage.routes";
dotenv.config();
export function createApp() {
  const app = express();
  connectDB();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  app.use("/api/v1/user", authRouter);
  app.use("/api/v1/onboarding", onboardingRouter);
  app.use("/api/v1/daily-check-in", dailyCheckInRouter);
  app.use("/api/v1/milestone", milestoneRouter);
  app.use("/api/v1/coping/strategy", copingStrategiesRouter);
  app.use("/api/v1/coping/usage", copingUsageRouter);
  app.use("/api/v1/user/analytics", analyticsRouter);
  return app;
}
