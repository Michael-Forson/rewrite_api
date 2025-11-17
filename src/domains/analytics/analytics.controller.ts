import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { dailyCheckInStreak, relapseStreak } from "./services/streakServices";
import { StatsService } from "./services/userStats";
import {
  analyzeCopingStrategyTrends,
  analyzeTriggerTrends,
} from "./services/trendsServices";
export const quickStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error("UserId not found");
  }
  const data = await Promise.all([
    dailyCheckInStreak(userId),
    relapseStreak(userId),
    StatsService.getCheckInSummary(userId, "7d"),
  ]);
  res.status(200).json({ message: "Overview successful", data });
});
export const getCheckInTimeSeries = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error("UserId not found");
    }

    // Parse period query parameter
    const periodQuery = (req.query.period as string) || "7d";
    let periodDays = 7;

    if (periodQuery === "30d") {
      periodDays = 30;
    }

    const data = await StatsService.getCheckInTimeSeries(userId, periodDays);
    res.status(200).json({ message: "Overview successful", data });
  }
);

/**
 * @desc    Get user's summary of triggers and coping strategies
 * @route   GET /api/v1/trends/summary
 * @access  Private
 * @query   duration (optional, '7d', '30d', '365d', 'all' - defaults to '30d')
 */
export const getTrendsSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // === 1. Get Query Param ===
    const duration = (req.query.duration as string) || "30d";
    const options = { userId, duration };

    // === 2. Call Both Services in Parallel ===
    // This is more efficient than calling them one by one.
    const [triggerData, strategyData] = await Promise.all([
      analyzeTriggerTrends(options),
      analyzeCopingStrategyTrends(options),
    ]);

    // === 3. Send Combined Response ===
    res.status(200).json({
      success: true,
      data: {
        duration,
        topTriggers: {
          ...triggerData,
          startDate: triggerData.startDate.toISOString(),
          endDate: triggerData.endDate.toISOString(),
        },
        topStrategies: {
          ...strategyData,
          startDate: strategyData.startDate.toISOString(),
          endDate: strategyData.endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error in getTrendsSummary controller:", error);
  }
};
