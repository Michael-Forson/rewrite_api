import { Router } from "express";
import {
  createDailyCheckIn,
  getMilestoneProgress,
  getMilestoneHistory,
  triggerMilestoneCheck,
} from "./milestone.controller";
import { authMiddleware } from "../../middleware/authMiddleware"; // Your auth middleware

const milestoneRouter: Router = Router();

// Apply authentication middleware to all routes
milestoneRouter.use(authMiddleware);

/**dd
 * @route   GET /api/milestone/progress
 * @desc    Get current milestone progress
 * @access  Private
 */
milestoneRouter.get("/progress", getMilestoneProgress);
/**
 * @route   GET /api/milestone/history
 * @desc    Get all milestone history
 * @access  Private
 */
milestoneRouter.get("/history", getMilestoneHistory);

/**
 * @route   POST /api/milestone/check
 * @desc    Manually trigger milestone check
 * @access  Private
 */
milestoneRouter.post("/check", triggerMilestoneCheck);

export default milestoneRouter;
