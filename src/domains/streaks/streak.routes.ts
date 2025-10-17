import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  streakDailyCheckIn,
  streakRelapse,
  streakSummary,
} from "./streak.controller";

const streakRouter: Router = Router();

streakRouter.get("/checkin", authMiddleware, streakDailyCheckIn);
streakRouter.get("/relapse", authMiddleware, streakRelapse);
streakRouter.get("/summary", authMiddleware, streakSummary);

export default streakRouter;
