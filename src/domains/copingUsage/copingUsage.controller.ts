import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import CopingUsage from "../copingUsage/copingUsage.model";
import { CopingStrategyModel } from "../copingStrategies/copingStrategies.model";

/**
 * @desc Log new coping strategy usage (when user uses a strategy)
 * @route POST /api/coping-usage
 * @access Authenticated user
 */
export const createCopingUsage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    console.log(userId);
    console.log(req.body);
    const {
      strategyId,
      cravingIntensityBefore,
      triggerContext,
      environment,
      notes,
      effectivenessRating,
    } = req.body;

    // Ensure referenced strategy exists
    const strategy = await CopingStrategyModel.findById(strategyId);
    if (!strategy) {
      res.status(404);
      throw new Error("Coping strategy not found.");
    }

    const usage = await CopingUsage.create({
      userId,
      strategyId,
      cravingIntensityBefore,
      triggerContext,
      environment,
      notes,
      effectivenessRating,
    });

    res.status(201).json({
      success: true,
      message: "Coping usage logged successfully.",
      data: usage,
    });
  }
);

/**
 * @desc Mark a coping usage as completed (update after use)
 * @route PUT /api/coping-usage/:id/complete
 * @access Authenticated user
 */
export const completeCopingUsage = asyncHandler(
  async (req: Request, res: Response) => {
    const copingId = req.params?.id;
    const { cravingIntensityAfter, notes, effectivenessRating } = req.body;

    const updatedUsage = await CopingUsage.findByIdAndUpdate(
      copingId,
      {
        cravingIntensityAfter,
        notes,
        effectivenessRating,
      },
      { new: true, runValidators: true }
    );

    if (!updatedUsage) {
      res.status(404);
      throw new Error("Coping usage record not found.");
    }

    res.status(200).json({
      success: true,
      message: "Coping usage updated successfully.",
      data: updatedUsage,
    });
  }
);

/**
 * @desc Get all coping usage records for a specific user
 * @route GET /api/coping-usage/user/:userId
 * @access Authenticated user
 */
export const getUserCopingUsage = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    const usages = await CopingUsage.find({ userId })
      .populate("strategyId", "displayName category")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: usages.length,
      data: usages,
    });
  }
);

/**
 * @desc Get all usage records for a specific strategy
 * @route GET /api/coping-usage/strategy/:strategyId
 * @access Admin or therapist
 */
export const getUsageByStrategy = asyncHandler(
  async (req: Request, res: Response) => {
    const { strategyId } = req.params;

    const usages = await CopingUsage.find({ strategyId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: usages.length,
      data: usages,
    });
  }
);

/**
 * @desc Get a single coping usage record
 * @route GET /api/coping-usage/:id
 * @access Authenticated user
 */
export const getCopingUsageById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const usage = await CopingUsage.findById(id).populate(
      "strategyId",
      "displayName category"
    );

    if (!usage) {
      res.status(404);
      throw new Error("Coping usage not found.");
    }

    res.status(200).json({
      success: true,
      data: usage,
    });
  }
);

/**
 * @desc Delete a coping usage record
 * @route DELETE /api/coping-usage/:id
 * @access Authenticated user
 */
export const deleteCopingUsage = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const deleted = await CopingUsage.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404);
      throw new Error("Coping usage record not found.");
    }

    res.status(200).json({
      success: true,
      message: "Coping usage deleted successfully.",
    });
  }
);
