import { DailyCheckIn } from "../../dailycheckIn/dailycheckIn.model"; // Adjust path
import mongoose from "mongoose";
import CopingUsage from "../../copingUsage/copingUsage.model"; // Adjust path

// Shape of the individual trend result
export interface ICopingStrategyTrend {
  strategyId: mongoose.Types.ObjectId;
  displayName: string; // e.g., "Deep Breathing"
  category: string; // e.g., "mindfulness"
  usageCount: number;
  averageRating: number;
}

// Options passed *into* the service from the controller
export interface ICopingStrategyTrendQueryOptions {
  userId: string;
  duration: string; // "7d", "30d", "365d", "all"
}

// The final object returned *by* the service
export interface ICopingStrategyTrendServiceResponse {
  topStrategies: ICopingStrategyTrend[];
  startDate: Date;
  endDate: Date;
}

// Shape of the individual trend result
export interface ITriggerTrend {
  trigger: string;
  totalOccurrences: number;
  resistedCount: number;
  resistedPercentage: number;
}

// Options passed *into* the service from the controller
export interface ITriggerTrendQueryOptions {
  userId: string;
  duration: string; // "7d", "30d", "365d", "all"
}

// The final object returned *by* the service
export interface ITriggerTrendServiceResponse {
  topTriggers: ITriggerTrend[];
  startDate: Date;
  endDate: Date;
}

/**
 * Calculates the date range based on a simple duration string.
 */
const getTriggerTrendDateRange = (
  duration: string
): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  endDate.setUTCHours(23, 59, 59, 999); // End of today

  let startDate: Date;
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  switch (duration) {
    case "7d":
      startDate = new Date(new Date().setDate(now.getDate() - 7));
      break;
    case "365d":
      startDate = new Date(new Date().setDate(now.getDate() - 365));
      break;
    case "all":
      startDate = new Date(0); // Unix epoch
      break;
    case "30d":
    default:
      startDate = new Date(new Date().setDate(now.getDate() - 30));
  }

  if (duration !== "all") {
    startDate.setUTCHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
};

/**
 * Analyzes user check-in data to identify top triggers and resistance rates.
 * @param options - The user ID and duration string.
 * @returns {Promise<ITriggerTrendServiceResponse>} A promise that resolves to the trend results and date range.
 */
export const analyzeTriggerTrends = async (
  options: ITriggerTrendQueryOptions
): Promise<ITriggerTrendServiceResponse> => {
  const { userId, duration } = options;

  // 1. Calculate the date range
  const { startDate, endDate } = getTriggerTrendDateRange(duration);

  try {
    // 2. Build aggregation pipeline
    const aggregationPipeline: any[] = [
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          checkInDate: {
            $gte: startDate,
            $lte: endDate,
          },
          triggers: { $exists: true, $not: { $size: 0 } },
        },
      },
      { $unwind: "$triggers" },
      {
        $group: {
          _id: { $toLower: "$triggers" },
          totalOccurrences: { $sum: 1 },
          resistedCount: {
            $sum: {
              $cond: [{ $ne: ["$relapse", true] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          trigger: "$_id",
          totalOccurrences: "$totalOccurrences",
          resistedCount: "$resistedCount",
          resistedPercentage: {
            $round: [
              {
                $cond: [
                  { $eq: ["$totalOccurrences", 0] },
                  0,
                  {
                    $multiply: [
                      { $divide: ["$resistedCount", "$totalOccurrences"] },
                      100,
                    ],
                  },
                ],
              },
              1,
            ],
          },
        },
      },
      { $sort: { totalOccurrences: -1 } },
      { $limit: 10 },
    ];

    // 3. Execute aggregation
    const topTriggers: ITriggerTrend[] = await DailyCheckIn.aggregate(
      aggregationPipeline
    );

    // 4. Return the complete response object
    return {
      topTriggers,
      startDate,
      endDate,
    };
  } catch (error) {
    console.error("Error during trigger trend analysis:", error);
    throw new Error("Failed to analyze trigger trends.");
  }
};

/**
 * Calculates the date range based on a simple duration string.
 */
const getCopingTrendDateRange = (
  duration: string
): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  endDate.setUTCHours(23, 59, 59, 999); // End of today

  let startDate: Date;
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  switch (duration) {
    case "7d":
      startDate = new Date(new Date().setDate(now.getDate() - 7));
      break;
    case "365d":
      startDate = new Date(new Date().setDate(now.getDate() - 365));
      break;
    case "all":
      startDate = new Date(0); // Unix epoch
      break;
    case "30d":
    default:
      startDate = new Date(new Date().setDate(now.getDate() - 30));
  }

  if (duration !== "all") {
    startDate.setUTCHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
};

/**
 * Analyzes user coping data to identify top-rated strategies.
 * @param options - The user ID and duration string.
 * @returns {Promise<ICopingStrategyTrendServiceResponse>} A promise that resolves to the trend results and date range.
 */
export const analyzeCopingStrategyTrends = async (
  options: ICopingStrategyTrendQueryOptions
): Promise<ICopingStrategyTrendServiceResponse> => {
  const { userId, duration } = options;

  // 1. Calculate the date range
  const { startDate, endDate } = getCopingTrendDateRange(duration);

  try {
    // 2. Build aggregation pipeline
    const aggregationPipeline: any[] = [
      // Stage 1: Filter by user, date, and only docs with a rating
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          usedAt: {
            //
            $gte: startDate,
            $lte: endDate,
          },
          effectivenessRating: { $exists: true, $ne: null }, // Only use rated entries
        },
      },
      // Stage 2: Group by the strategyId
      {
        $group: {
          _id: "$strategyId", // Group by the ID of the coping strategy
          usageCount: { $sum: 1 },
          averageRating: { $avg: "$effectivenessRating" }, // Calculate the average rating
        },
      },
      // Stage 3: Sort by the highest average rating
      {
        $sort: { averageRating: -1 },
      },
      // Stage 4: Limit to the top 5 strategies
      {
        $limit: 5,
      },
      // Stage 5: Join with the CopingStrategy collection to get names
      {
        $lookup: {
          from: "copingstrategies", // Mongoose collection name
          localField: "_id",
          foreignField: "_id",
          as: "strategyDetails",
        },
      },
      // Stage 6: Unwind the strategyDetails array
      {
        $unwind: {
          path: "$strategyDetails",
          preserveNullAndEmptyArrays: true, // Keep docs even if strategy was deleted
        },
      },
      // Stage 7: Project to the final, clean format
      {
        $project: {
          _id: 0,
          strategyId: "$_id",
          usageCount: "$usageCount",
          averageRating: { $round: ["$averageRating", 1] }, // Round to 1 decimal
          displayName: "$strategyDetails.displayName", //
          category: "$strategyDetails.category", //
        },
      },
    ];

    // 3. Execute aggregation
    const topStrategies: ICopingStrategyTrend[] = await CopingUsage.aggregate(
      aggregationPipeline
    );

    // 4. Return the complete response object
    return {
      topStrategies,
      startDate,
      endDate,
    };
  } catch (error) {
    console.error("Error during coping strategy trend analysis:", error);
    throw new Error("Failed to analyze coping strategy trends.");
  }
};
