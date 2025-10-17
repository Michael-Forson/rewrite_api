import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  checkAndProcessMilestone,
  getCurrentMilestoneProgress,
  getUserMilestones,
} from "../milestone/milestone.service";
import { DailyCheckIn } from "../dailycheckIn/dailycheckIn.model";

/**
 * Create a daily check-in and process milestone
 */
export const createDailyCheckIn = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; // Assume user is authenticated
    const {
      moodLevel,
      energyLevel,
      cravingLevel,
      urgeLevel,
      triggers,
      copingStrategies,
      relapse,
      note,
      checkInDate,
    } = req.body;

    // Normalize the check-in date
    const normalizedDate = new Date(checkInDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    // Create the daily check-in
    const checkIn = await DailyCheckIn.create({
      userId,
      moodLevel,
      energyLevel,
      cravingLevel,
      urgeLevel,
      triggers,
      copingStrategies,
      relapse: relapse || false,
      isBackfill: false,
      checkInDate: normalizedDate,
      note,
    });

    // Check and process milestone after check-in
    const milestoneResult = await checkAndProcessMilestone(
      new mongoose.Types.ObjectId(userId)
    );

    // Build response message based on milestone result
    let responseMessage = "Check-in recorded successfully";
    
    if (milestoneResult.milestoneChecked) {
      if (milestoneResult.shouldResetMilestone) {
        // Milestone failed - inform user about reset
        responseMessage = milestoneResult.message;
      } else if (milestoneResult.milestoneChecked.status === "completed") {
        // Milestone completed - celebrate!
        responseMessage = milestoneResult.message;
      }
    }

    res.status(201).json({
      success: true,
      message: responseMessage,
      data: {
        checkIn,
        milestone: {
          status: milestoneResult.milestoneChecked?.status,
          message: milestoneResult.message,
          shouldResetMilestone: milestoneResult.shouldResetMilestone,
          completedMilestone: milestoneResult.shouldResetMilestone 
            ? null 
            : milestoneResult.milestoneChecked,
          failedMilestone: milestoneResult.shouldResetMilestone 
            ? milestoneResult.milestoneChecked 
            : null,
          newMilestoneAttempt: milestoneResult.newMilestoneCreated,
          resetInfo: milestoneResult.resetInfo,
        },
      },
    });
  } catch (error: any) {
    console.error("Error creating daily check-in:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error creating daily check-in",
    });
  }
};

/**
 * Get current milestone progress
 */
export const getMilestoneProgress = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const progress = await getCurrentMilestoneProgress(
      new mongoose.Types.ObjectId(userId)
    );

    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error: any) {
    console.error("Error getting milestone progress:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error getting milestone progress",
    });
  }
};

/**
 * Get all user milestones (history)
 */
export const getMilestoneHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await getUserMilestones(
      new mongoose.Types.ObjectId(userId)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error getting milestone history:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error getting milestone history",
    });
  }
};

/**
 * Manually trigger milestone check (useful for testing or admin purposes)
 */
export const triggerMilestoneCheck = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const milestoneResult = await checkAndProcessMilestone(
      new mongoose.Types.ObjectId(userId)
    );

    res.status(200).json({
      success: true,
      data: milestoneResult,
    });
  } catch (error: any) {
    console.error("Error triggering milestone check:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error triggering milestone check",
    });
  }
};

/**
 * Get milestone statistics and insights
 */
export const getMilestoneStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const [progress, history] = await Promise.all([
      getCurrentMilestoneProgress(new mongoose.Types.ObjectId(userId)),
      getUserMilestones(new mongoose.Types.ObjectId(userId)),
    ]);

    // Calculate additional statistics
    const completedMilestones = history.allMilestones.filter(
      (m) => m.status === "completed"
    );
    const failedAttempts = history.allMilestones.filter(
      (m) => m.status === "failed"
    );

    const totalMedals = {
      gold: completedMilestones.filter((m) => m.medal === "gold").length,
      silver: completedMilestones.filter((m) => m.medal === "silver").length,
      bronze: completedMilestones.filter((m) => m.medal === "bronze").length,
    };

    const highestMilestone = completedMilestones.length > 0
      ? Math.max(...completedMilestones.map((m) => m.milestoneDays))
      : 0;

    const averageCompletionRate = completedMilestones.length > 0
      ? completedMilestones.reduce((sum, m) => sum + m.completionPercentage, 0) / completedMilestones.length
      : 0;

    const averageRelapseRate = completedMilestones.length > 0
      ? completedMilestones.reduce((sum, m) => sum + m.relapsePercentage, 0) / completedMilestones.length
      : 0;

    res.status(200).json({
      success: true,
      data: {
        currentProgress: progress,
        statistics: {
          totalCompleted: completedMilestones.length,
          totalFailed: failedAttempts.length,
          highestMilestone,
          medals: totalMedals,
          averageCompletionRate: Math.round(averageCompletionRate * 100) / 100,
          averageRelapseRate: Math.round(averageRelapseRate * 100) / 100,
          successRate: history.allMilestones.length > 0
            ? Math.round((completedMilestones.length / history.allMilestones.length) * 100 * 100) / 100
            : 0,
        },
        history: history.groupedMilestones,
      },
    });
  } catch (error: any) {
    console.error("Error getting milestone stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error getting milestone stats",
    });
  }
};