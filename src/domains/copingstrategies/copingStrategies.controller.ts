import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import copingStrategy from "./copingStrategies.model";

/**
 * @desc Create a new coping strategy
 * @route POST /api/coping-strategies
 * @access Admin (or therapist)
 */
export const createCopingStrategy = asyncHandler(
  async (req: Request, res: Response) => {
    const strategyData = req.body;

    const newStrategy = await copingStrategy.create(strategyData);

    res.status(201).json({
      success: true,
      message: "Coping strategy created successfully.",
      data: newStrategy,
    });
  }
);

/**
 * @desc Get all coping strategies
 * @route GET /api/coping-strategies
 * @access Public / Authenticated user
 */
export const getAllCopingStrategies = asyncHandler(
  async (req: Request, res: Response) => {
    const { category, difficultyLevel, isActive } = req.query;

    const filter: any = {};
    if (category) filter.category = category;
    if (difficultyLevel) filter.difficultyLevel = difficultyLevel;
    if (isActive) filter.isActive = isActive === "true";

    const strategies = await copingStrategy.find(filter).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: strategies.length,
      data: strategies,
    });
  }
);

/**
 * @desc Get a single coping strategy by ID
 * @route GET /api/coping-strategies/:id
 * @access Public / Authenticated user
 */
export const getCopingStrategyById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const strategy = await copingStrategy.findById(id);

    if (!strategy) {
      res.status(404);
      throw new Error("Coping strategy not found.");
    }

    res.status(200).json({
      success: true,
      data: strategy,
    });
  }
);

/**
 * @desc Update a coping strategy
 * @route PUT /api/coping-strategies/:id
 * @access Admin (or therapist)
 */
export const updateCopingStrategy = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const updatedStrategy = await copingStrategy.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedStrategy) {
      res.status(404);
      throw new Error("Coping strategy not found.");
    }

    res.status(200).json({
      success: true,
      message: "Coping strategy updated successfully.",
      data: updatedStrategy,
    });
  }
);

/**
 * @desc Delete a coping strategy
 * @route DELETE /api/coping-strategies/:id
 * @access Admin
 */
export const deleteCopingStrategy = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const deleted = await copingStrategy.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404);
      throw new Error("Coping strategy not found.");
    }

    res.status(200).json({
      success: true,
      message: "Coping strategy deleted successfully.",
    });
  }
);
