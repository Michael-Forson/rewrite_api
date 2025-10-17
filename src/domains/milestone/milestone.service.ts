import mongoose from "mongoose";
import { DailyCheckIn } from "../dailycheckIn/dailycheckIn.model";
import { Milestone, IMilestoneDocument } from "./milestone.model";
import User from "../authentication/user.model";

// 🛠 Helper to normalize date to UTC midnight
const normalizeToUTCDate = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
};

// 🛠 Add days to a date (accounting for leap years)
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return normalizeToUTCDate(result);
};

// 🛠 Calculate days between two dates
const getDaysBetween = (startDate: Date, endDate: Date): number => {
  const start = normalizeToUTCDate(startDate);
  const end = normalizeToUTCDate(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
};

// 📊 Milestone definitions
const MILESTONE_DAYS = [7, 14, 30, 60, 90, 180, 365];

// 🎯 Medal thresholds
const getMedal = (relapsePercentage: number): "gold" | "silver" | "bronze" => {
  if (relapsePercentage <= 20) return "gold";
  if (relapsePercentage <= 50) return "silver";
  return "bronze";
};

interface MilestoneCheckResult {
  milestoneChecked: IMilestoneDocument | null;
  newMilestoneCreated: IMilestoneDocument | null;
  message: string;
  shouldResetMilestone: boolean;
  resetInfo?: {
    failedMilestone: number;
    restartFromDay: number;
    newStartDate: Date;
    newEndDate: Date;
  };
}

/**
 * Check and process milestone for a user
 * Call this function after each daily check-in
 */
export const checkAndProcessMilestone = async (
  userId: mongoose.Types.ObjectId
): Promise<MilestoneCheckResult> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get the last completed milestone
    const lastCompletedMilestone = await Milestone.findOne({
      userId,
      status: "completed",
    })
      .sort({ milestoneDays: -1 })
      .lean();

    // Determine which milestone we're working on
    const nextMilestoneDays = getNextMilestoneDays(
      lastCompletedMilestone?.milestoneDays
    );

    if (!nextMilestoneDays) {
      return {
        milestoneChecked: null,
        newMilestoneCreated: null,
        message: "All milestones completed! 🎉",
        shouldResetMilestone: false,
      };
    }

    // Calculate the start date for current milestone period
    let milestoneStartDate: Date;
    if (lastCompletedMilestone) {
      // Start from the day after the last completed milestone ended
      milestoneStartDate = addDays(lastCompletedMilestone.endDate, 1);
    } else {
      // First milestone starts from user's recovery start date
      milestoneStartDate = normalizeToUTCDate(user.createdAt);
    }

    // Calculate end date for this milestone
    const milestoneEndDate = addDays(milestoneStartDate, nextMilestoneDays - 1);

    // Check if we've reached the end of the milestone period
    const today = normalizeToUTCDate(new Date());
    if (today < milestoneEndDate) {
      return {
        milestoneChecked: null,
        newMilestoneCreated: null,
        message: "Milestone period not yet completed",
        shouldResetMilestone: false,
      };
    }

    // Fetch all check-ins for this milestone period
    const checkIns = await DailyCheckIn.find({
      userId,
      checkInDate: {
        $gte: milestoneStartDate,
        $lte: milestoneEndDate,
      },
    }).lean();

    // Calculate metrics
    const totalCheckIns = checkIns.length;
    const totalRelapses = checkIns.filter((c) => c.relapse === true).length;
    const expectedCheckIns = getDaysBetween(
      milestoneStartDate,
      milestoneEndDate
    );
    const completionPercentage = (totalCheckIns / expectedCheckIns) * 100;
    const relapsePercentage =
      totalCheckIns > 0 ? (totalRelapses / totalCheckIns) * 100 : 0;

    // Check if milestone is met
    const isCompletionMet = completionPercentage >= 70;

    // Get or create milestone record
    let milestone = await Milestone.findOne({
      userId,
      milestoneDays: nextMilestoneDays,
      status: "pending",
      startDate: milestoneStartDate,
    });

    if (!milestone) {
      const attemptNumber = await getAttemptNumber(userId, nextMilestoneDays);
      milestone = new Milestone({
        userId,
        milestoneDays: nextMilestoneDays,
        startDate: milestoneStartDate,
        endDate: milestoneEndDate,
        attemptNumber,
      });
    }

    // Update milestone data
    milestone.completionPercentage =
      Math.round(completionPercentage * 100) / 100;
    milestone.relapsePercentage = Math.round(relapsePercentage * 100) / 100;
    milestone.totalCheckIns = totalCheckIns;
    milestone.totalRelapses = totalRelapses;

    if (isCompletionMet) {
      // ✅ Milestone completed successfully
      milestone.status = "completed";
      milestone.achievedDate = today;
      milestone.medal = getMedal(relapsePercentage);
      await milestone.save();

      return {
        milestoneChecked: milestone,
        newMilestoneCreated: null,
        message: `🎉 Congratulations! ${nextMilestoneDays}-day milestone completed with ${milestone.medal} medal!`,
        shouldResetMilestone: false,
      };
    } else {
      // ❌ Milestone failed - Mark as failed and create new attempt
      milestone.status = "failed";
      await milestone.save();

      // Calculate where to restart from
      const previousMilestoneDays = getPreviousMilestoneDays(nextMilestoneDays);
      const restartDay = previousMilestoneDays + 1;

      // New milestone starts from the day after the last completed milestone
      let newStartDate: Date;
      if (lastCompletedMilestone) {
        newStartDate = addDays(lastCompletedMilestone.endDate, 1);
      } else {
        newStartDate = normalizeToUTCDate(user.createdAt);
      }

      const newEndDate = addDays(newStartDate, nextMilestoneDays - 1);
      const newAttemptNumber = await getAttemptNumber(
        userId,
        nextMilestoneDays
      );

      // Create new milestone attempt
      const newMilestone = await Milestone.create({
        userId,
        milestoneDays: nextMilestoneDays,
        status: "pending",
        startDate: newStartDate,
        endDate: newEndDate,
        attemptNumber: newAttemptNumber,
        completionPercentage: 0,
        relapsePercentage: 0,
        totalCheckIns: 0,
        totalRelapses: 0,
      });

      return {
        milestoneChecked: milestone,
        newMilestoneCreated: newMilestone,
        message: `⚠️ ${nextMilestoneDays}-day milestone failed (${completionPercentage.toFixed(
          1
        )}% completion). Starting fresh attempt #${newAttemptNumber} from day ${restartDay}!`,
        shouldResetMilestone: true,
        resetInfo: {
          failedMilestone: nextMilestoneDays,
          restartFromDay: restartDay,
          newStartDate,
          newEndDate,
        },
      };
    }
  } catch (error) {
    console.error("Error checking milestone:", error);
    throw error;
  }
};

/**
 * Get the next milestone to work on
 */
const getNextMilestoneDays = (lastCompletedDays?: number): number | null => {
  if (!lastCompletedDays) {
    return MILESTONE_DAYS[0]; // Start with 7 days
  }

  const currentIndex = MILESTONE_DAYS.indexOf(lastCompletedDays);
  if (currentIndex === -1 || currentIndex === MILESTONE_DAYS.length - 1) {
    return null; // All milestones completed
  }

  return MILESTONE_DAYS[currentIndex + 1];
};

/**
 * Get the previous milestone days
 */
const getPreviousMilestoneDays = (currentMilestoneDays: number): number => {
  const currentIndex = MILESTONE_DAYS.indexOf(currentMilestoneDays);
  if (currentIndex <= 0) {
    return 0;
  }
  return MILESTONE_DAYS[currentIndex - 1];
};

/**
 * Get attempt number for a milestone
 */
const getAttemptNumber = async (
  userId: mongoose.Types.ObjectId,
  milestoneDays: number
): Promise<number> => {
  const previousAttempts = await Milestone.countDocuments({
    userId,
    milestoneDays,
  });
  return previousAttempts + 1;
};

/**
 * Get user's current milestone progress
 */
export const getCurrentMilestoneProgress = async (
  userId: mongoose.Types.ObjectId
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const lastCompletedMilestone = await Milestone.findOne({
    userId,
    status: "completed",
  })
    .sort({ milestoneDays: -1 })
    .lean();

  const nextMilestoneDays = getNextMilestoneDays(
    lastCompletedMilestone?.milestoneDays
  );

  if (!nextMilestoneDays) {
    return {
      message: "All milestones completed!",
      completedMilestones: MILESTONE_DAYS,
      currentProgress: null,
    };
  }

  // Find the current pending milestone
  let currentMilestone = await Milestone.findOne({
    userId,
    milestoneDays: nextMilestoneDays,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .lean();

  // If no pending milestone exists, calculate based on last completed
  let milestoneStartDate: Date;
  let milestoneEndDate: Date;

  if (currentMilestone) {
    milestoneStartDate = normalizeToUTCDate(currentMilestone.startDate);
    milestoneEndDate = normalizeToUTCDate(currentMilestone.endDate);
  } else {
    // Calculate dates for the next milestone
    if (lastCompletedMilestone) {
      milestoneStartDate = addDays(lastCompletedMilestone.endDate, 1);
    } else {
      milestoneStartDate = normalizeToUTCDate(user.createdAt);
    }
    milestoneEndDate = addDays(milestoneStartDate, nextMilestoneDays - 1);
  }

  const today = normalizeToUTCDate(new Date());

  // Fetch check-ins for current period
  const checkIns = await DailyCheckIn.find({
    userId,
    checkInDate: {
      $gte: milestoneStartDate,
      $lte: today < milestoneEndDate ? today : milestoneEndDate,
    },
  }).lean();

  const totalCheckIns = checkIns.length;
  const totalRelapses = checkIns.filter((c) => c.relapse === true).length;
  const daysElapsed =
    today > milestoneEndDate
      ? getDaysBetween(milestoneStartDate, milestoneEndDate)
      : getDaysBetween(milestoneStartDate, today);
  const completionPercentage =
    (totalCheckIns / Math.min(daysElapsed, nextMilestoneDays)) * 100;
  const relapsePercentage =
    totalCheckIns > 0 ? (totalRelapses / totalCheckIns) * 100 : 0;

  // Calculate days left
  const daysLeft =
    today >= milestoneEndDate
      ? 0
      : Math.max(0, getDaysBetween(today, milestoneEndDate));
  const daysRemaining = Math.max(0, nextMilestoneDays - daysElapsed);

  // Get attempt number
  const attemptNumber =
    currentMilestone?.attemptNumber ||
    (await getAttemptNumber(userId, nextMilestoneDays));

  return {
    currentMilestone: nextMilestoneDays,
    startDate: milestoneStartDate,
    endDate: milestoneEndDate,
    daysElapsed,
    daysLeft,
    daysRemaining,
    totalDays: nextMilestoneDays,
    completionPercentage: Math.round(completionPercentage * 100) / 100,
    relapsePercentage: Math.round(relapsePercentage * 100) / 100,
    totalCheckIns,
    totalRelapses,
    isOnTrack: completionPercentage >= 70,
    projectedMedal: getMedal(relapsePercentage),
    attemptNumber,
    previousCompletedMilestone: lastCompletedMilestone?.milestoneDays || 0,
  };
};

/**
 * Get all user milestones with summary
 */
export const getUserMilestones = async (userId: mongoose.Types.ObjectId) => {
  const milestones = await Milestone.find({ userId })
    .sort({ milestoneDays: 1, createdAt: 1 })
    .lean();

  // Group by milestone days to show attempts
  const groupedMilestones = milestones.reduce((acc: any, milestone) => {
    const key = milestone.milestoneDays;
    if (!acc[key]) {
      acc[key] = {
        milestoneDays: key,
        attempts: [],
        totalAttempts: 0,
        completed: false,
        failed: 0,
      };
    }

    acc[key].attempts.push(milestone);
    acc[key].totalAttempts++;

    if (milestone.status === "completed") {
      acc[key].completed = true;
    } else if (milestone.status === "failed") {
      acc[key].failed++;
    }

    return acc;
  }, {});

  return {
    allMilestones: milestones,
    groupedMilestones,
    summary: {
      totalMilestones: MILESTONE_DAYS.length,
      completedMilestones: Object.values(groupedMilestones).filter(
        (g: any) => g.completed
      ).length,
      inProgress: Object.values(groupedMilestones).filter(
        (g: any) =>
          !g.completed && g.attempts.some((a: any) => a.status === "pending")
      ).length,
    },
  };
};
