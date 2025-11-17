import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { DailyCheckIn } from "../../dailycheckIn/dailycheckIn.model";
import { normalizeToUTCDate } from "../../../utils/dateManagement";

export const dailyCheckInStreak = async (userId: string) => {
  // Fetch check-ins sorted by date
  const checkIns = await DailyCheckIn.find({ userId })
    .sort({ checkInDate: -1 })
    .select("checkInDate")
    .lean();

  if (!checkIns.length) {
    return { streak: 0 };
  }

  const checkInSet = new Set(
    checkIns.map((ci) => new Date(ci.checkInDate).toISOString().split("T")[0])
  );

  let streakCount = 0;
  let currentDate = normalizeToUTCDate(new Date());
  let currentDateStr = currentDate.toISOString().split("T")[0];

  // 🧠 If user didn’t check in today, start from yesterday
  if (!checkInSet.has(currentDateStr)) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  while (true) {
    currentDateStr = currentDate.toISOString().split("T")[0];

    if (checkInSet.has(currentDateStr)) {
      streakCount++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { streak: streakCount };
};

export const relapseStreak = async (userId: string) => {
  const checkIns = await DailyCheckIn.find({ userId })
    .sort({ checkInDate: -1 })
    .select("checkInDate relapse")
    .lean();

  if (!checkIns.length) {
    return { relapseStreak: 0 };
  }

  // Map dates to relapse values
  const relapseMap = new Map<string, boolean>();
  for (const ci of checkIns) {
    const dateStr = new Date(ci.checkInDate).toISOString().split("T")[0];
    relapseMap.set(dateStr, ci.relapse);
  }

  let relapseStreakCount = 0;
  let currentDate = normalizeToUTCDate(new Date());
  let currentDateStr = currentDate.toISOString().split("T")[0];

  // 🧠 If user didn’t check in today, start from yesterday
  if (!relapseMap.has(currentDateStr)) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // 🔁 Count consecutive non-relapse days
  while (true) {
    currentDateStr = currentDate.toISOString().split("T")[0];

    if (relapseMap.has(currentDateStr)) {
      const isRelapse = relapseMap.get(currentDateStr);
      if (isRelapse) {
        // Stop if user relapsed on this day
        break;
      }
      relapseStreakCount++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { relapseStreak: relapseStreakCount };
};
