import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { DailyCheckIn } from "./dailycheckIn.model";
import { normalizeToUTCDate } from "../../utils/dateManagement";

export const createDailyCheckIn = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const { id } = req.user;
    const { ...otherFields } = req.body;
    const today = normalizeToUTCDate(new Date());

    const newCheckIn = await DailyCheckIn.create({
      userId: id,
      ...otherFields,
      checkInDate: today, // today
    });

    res.status(201).json({ message: "Daily check-in saved", data: newCheckIn });
  }
);

export const backfillMultipleDailyCheckIns = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const { _id: userId } = req.user;
    const checkIns = req.body; // expect array

    if (!Array.isArray(checkIns) || checkIns.length === 0) {
      res
        .status(400)
        .json({ error: "Request body must be a non-empty array." });
      return;
    }

    const today = normalizeToUTCDate(new Date());
    const results: { success: any[]; errors: any[] } = {
      success: [],
      errors: [],
    };

    for (const checkIn of checkIns) {
      try {
        const {
          moodLevel,
          energyLevel,
          urgeLevel,
          triggers,
          copingStrategies,
          relapse,
          note,
          checkInDate,
        } = checkIn;

        if (!checkInDate) {
          throw new Error("checkInDate is required.");
        }

        const targetDate = normalizeToUTCDate(new Date(checkInDate));
        const diffInMs = today.getTime() - targetDate.getTime();
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

        // 1. No future dates
        if (targetDate > today) throw new Error("Future dates not allowed.");

        // 2. Only allow past 1–3 days
        if (diffInDays <= 0 || diffInDays > 3) {
          throw new Error("Backfill allowed only for the past 1-3 days.");
        }

        // 3. Check duplicates
        const existing = await DailyCheckIn.findOne({
          userId,
          checkInDate: targetDate,
        });

        if (existing)
          throw new Error(
            `Already checked in for ${targetDate.toDateString()}.`
          );

        // 4. Create check-in
        const created = await DailyCheckIn.create({
          userId,
          moodLevel,
          energyLevel,
          urgeLevel,
          triggers,
          copingStrategies,
          relapse,
          note,
          isBackfill: true,
          checkInDate: targetDate,
        });

        results.success.push(created);
      } catch (err: any) {
        results.errors.push({
          data: checkIn,
          message: err.message || "Unknown error",
        });
      }
    }

    res.status(results.errors.length > 0 ? 207 : 201).json({
      message:
        results.errors.length > 0
          ? "Some backfills succeeded, some failed."
          : "All backfills created successfully.",
      results,
    });
  }
);
