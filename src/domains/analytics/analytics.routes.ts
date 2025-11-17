import { Router } from "express";
import {
  getCheckInTimeSeries,
  getTrendsSummary,
  quickStats,
} from "./analytics.controller";
import { authMiddleware } from "../../middleware/authMiddleware";

const analyticsRouter: Router = Router();

analyticsRouter.get("/overview", authMiddleware, quickStats);
analyticsRouter.get("/time-series", authMiddleware, getCheckInTimeSeries);
analyticsRouter.get("/trends", authMiddleware, getTrendsSummary);

export default analyticsRouter;
