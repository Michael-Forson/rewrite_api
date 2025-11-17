import express, { Router } from "express";
import {
  createCopingUsage,
  completeCopingUsage,
  getUserCopingUsage,
  getUsageByStrategy,
  getCopingUsageById,
  deleteCopingUsage,
} from "./copingUsage.controller";
import { authMiddleware, isAdmin } from "../../middleware/authMiddleware";

const copingUsageRouter: Router = Router();

// Log usage (start)
copingUsageRouter.post("/", authMiddleware, createCopingUsage);

// Complete usage (after reflection)
copingUsageRouter.patch("/complete/:id", authMiddleware, completeCopingUsage);

// Get user's history
copingUsageRouter.get("/user/:userId", authMiddleware, getUserCopingUsage);

// // Get usage per strategy (for analytics or admin)
// router.get("/strategy/:strategyId",authMiddleware,  getUsageByStrategy);

// // Get single record
// router.get("/:id",authMiddleware,  getCopingUsageById);

// // Delete record
// router.delete("/:id",authMiddleware,  deleteCopingUsage);

export default copingUsageRouter;
