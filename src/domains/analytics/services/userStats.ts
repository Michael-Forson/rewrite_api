import { addDays, normalizeToUTCDate } from "../../../utils/dateManagement";
import {
  DailyCheckIn,
  DailyCheckInDocument,
} from "../../dailycheckIn/dailycheckIn.model"; // Assuming path
import mongoose from "mongoose";

// Define the shape of the output
export interface ICheckInStats {
  totalCheckIns: number;
  avgMood: number | null;
  avgEnergy: number | null;
  avgUrge: number | null;
}
// Define the shape of the output for each day
export interface ITimeSeriesDataPoint {
  date: string; // ISO Date string (e.g., "2025-11-14T00:00:00.000Z")
  moodLevel: number | null;
  energyLevel: number | null;
  urgeLevel: number | null;
}
/**
 * Parses a string like "7d", "30d", or "all" into a start date.
 */
const getStartDateFromPeriod = (period: string): Date | null => {
  const now = new Date();

  if (period === "all") {
    return null; // No date filter
  }

  let daysToSubtract = 0;

  if (period.endsWith("d")) {
    const days = parseInt(period.slice(0, -1), 10);
    if (!isNaN(days)) {
      daysToSubtract = days;
    }
  } else {
    // Default to 30 days if format is invalid
    daysToSubtract = 7;
  }

  now.setUTCHours(0, 0, 0, 0); // Start of today
  now.setDate(now.getDate() - daysToSubtract);
  return now;
};

export class StatsService {
  /**
   * Calculates check-in statistics for a user over a given period.
   * @param userId - The ID of the user
   * @param period - The time period (e.g., "7d", "30d", "all")
   */
  public static async getCheckInSummary(
    userId: string,
    period: string = "7d"
  ): Promise<ICheckInStats> {
    const matchStage: any = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    const startDate = getStartDateFromPeriod(period);
    if (startDate) {
      // Use checkInDate for filtering, as it's the user-reported date
      matchStage.checkInDate = { $gte: startDate };
    }

    const aggregationPipeline = [
      // 1. Filter documents by user and date range
      { $match: matchStage },

      // 2. Group all matched documents into one
      {
        $group: {
          _id: "$userId", // Group by user ID
          totalCheckIns: { $sum: 1 },
          avgMood: { $avg: "$moodLevel" },
          avgEnergy: { $avg: "$energyLevel" },
          avgUrge: { $avg: "$urgeLevel" },
        },
      },

      // 3. Project to shape the final output
      {
        $project: {
          _id: 0, // Hide the _id field
          totalCheckIns: 1,
          // Round averages to 2 decimal places
          avgMood: { $round: ["$avgMood", 1] },
          avgEnergy: { $round: ["$avgEnergy", 1] },
          avgUrge: { $round: ["$avgUrge", 1] },
        },
      },
    ];

    const result = await DailyCheckIn.aggregate(aggregationPipeline);

    // If no check-ins are found, aggregation returns []
    if (result.length === 0) {
      return {
        totalCheckIns: 0,
        avgMood: null,
        avgEnergy: null,
        avgUrge: null,
      };
    }

    return result[0];
  }
  public static async getCheckInTimeSeries(
    userId: string,
    periodDays: number = 7
  ): Promise<ITimeSeriesDataPoint[]> {
    // 1. Define the date range
    const endDate = normalizeToUTCDate(new Date()); // Today
    const startDate = addDays(endDate, -(periodDays - 1)); // 7 days ago (inclusive)

    // 2. Fetch all existing check-ins within the range
    const checkIns = await DailyCheckIn.find({
      userId: new mongoose.Types.ObjectId(userId),
      checkInDate: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .select("checkInDate moodLevel energyLevel urgeLevel")
      .lean(); // Use .lean() for faster, plain JS objects

    // 3. Create a Map for fast lookups (O(1))
    const checkInMap = new Map<string, DailyCheckInDocument>();
    checkIns.forEach((checkIn) => {
      const normalizedDateStr = normalizeToUTCDate(
        checkIn.checkInDate
      ).toISOString();
      checkInMap.set(normalizedDateStr, checkIn);
    });

    // 4. Build the final array, filling gaps
    const results: ITimeSeriesDataPoint[] = [];
    let currentDate = new Date(startDate);

    for (let i = 0; i < periodDays; i++) {
      const dateStr = currentDate.toISOString();
      const existingCheckIn = checkInMap.get(dateStr);

      if (existingCheckIn) {
        // Data exists for this day
        results.push({
          date: dateStr,
          moodLevel: existingCheckIn.moodLevel,
          energyLevel: existingCheckIn.energyLevel,
          urgeLevel: existingCheckIn.urgeLevel,
        });
      } else {
        // No data for this day, push a "gap" object
        results.push({
          date: dateStr,
          moodLevel: null,
          energyLevel: null,
          urgeLevel: null,
        });
      }

      // Move to the next day
      currentDate = addDays(currentDate, 1);
    }

    return results;
  }
}
