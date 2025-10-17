import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { DailyCheckIn } from "../dailycheckIn/dailycheckIn.model";
import { normalizeToUTCDate } from "../../utils/dateManagement";

export const streakDailyCheckIn = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const userId = req.user._id;

    // Fetch check-ins sorted by date
    const checkIns = await DailyCheckIn.find({ userId })
      .sort({ checkInDate: -1 })
      .select("checkInDate")
      .lean();

    if (!checkIns.length) {
      res.status(200).json({ streak: 0 });
      return;
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

    res.status(200).json({
      streak: streakCount,
    });
  }
);

export const streakRelapse = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const userId = req.user._id;
    const checkIns = await DailyCheckIn.find({ userId })
      .sort({ checkInDate: -1 })
      .select("checkInDate relapse")
      .lean();

    if (!checkIns.length) {
      res.status(200).json({ relapseStreak: 0 });
      return;
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

    res.status(200).json({
      relapseStreak: relapseStreakCount,
    });
  }
);
export const streakSummary = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const userId = req.user._id;

    // Fetch all check-ins once (with relapse info)
    const checkIns = await DailyCheckIn.find({ userId })
      .sort({ checkInDate: -1 })
      .select("checkInDate relapse")
      .lean();

    if (!checkIns.length) {
      res.status(200).json({ checkInStreak: 0, relapseStreak: 0 });
      return;
    }

    // Build a Map for relapse values and a Set for check-in dates
    const relapseMap = new Map<string, boolean>();
    const checkInDateSet = new Set<string>();
    for (const ci of checkIns) {
      const dateStr = new Date(ci.checkInDate).toISOString().split("T")[0];
      relapseMap.set(dateStr, ci.relapse);
      checkInDateSet.add(dateStr);
    }

    // ============================
    // 🧭 DAILY CHECK-IN STREAK LOGIC
    // ============================
    let checkInStreakCount = 0;
    let currentDate = normalizeToUTCDate(new Date());
    let currentDateStr = currentDate.toISOString().split("T")[0];

    // If user didn't check in today, start from yesterday
    if (!checkInDateSet.has(currentDateStr)) {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    while (true) {
      currentDateStr = currentDate.toISOString().split("T")[0];
      if (checkInDateSet.has(currentDateStr)) {
        checkInStreakCount++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    // ============================
    // 🔥 RELAPSE STREAK LOGIC
    // ============================
    let relapseStreakCount = 0;
    let relapseDate = normalizeToUTCDate(new Date());
    let relapseDateStr = relapseDate.toISOString().split("T")[0];

    // If user didn't check in today, start from yesterday
    if (!relapseMap.has(relapseDateStr)) {
      relapseDate.setDate(relapseDate.getDate() - 1);
    }

    while (true) {
      relapseDateStr = relapseDate.toISOString().split("T")[0];

      if (relapseMap.has(relapseDateStr)) {
        const isRelapse = relapseMap.get(relapseDateStr);
        if (isRelapse) {
          break;
        }
        relapseStreakCount++;
        relapseDate.setDate(relapseDate.getDate() - 1);
      } else {
        break;
      }
    }

    // ============================
    // 📤 RESPONSE
    // ============================
    res.status(200).json({
      checkInStreak: checkInStreakCount,
      relapseStreak: relapseStreakCount,
    });
  }
);