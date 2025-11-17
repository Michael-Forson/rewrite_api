import express, { Router } from "express";
import {
  createCopingStrategy,
  getAllCopingStrategies,
  getCopingStrategyById,
  updateCopingStrategy,
  deleteCopingStrategy,
} from "./copingStrategies.controller";
import { authMiddleware, isAdmin } from "../../middleware/authMiddleware";
import { validateRequestWithZod } from "../../middleware/zodValidationMiddleware";
import { copingStrategyValidationSchema } from "./copingStrategies.validation";

const copingStrategiesRouter: Router = Router();
copingStrategiesRouter.use(authMiddleware);
// Public routesd
copingStrategiesRouter.get("/", getAllCopingStrategies);
copingStrategiesRouter.get("/:id", getCopingStrategyById);

// For now (if no auth yet):
copingStrategiesRouter.post(
  "/",
  validateRequestWithZod(copingStrategyValidationSchema),
  createCopingStrategy
);
copingStrategiesRouter.patch("/:id", updateCopingStrategy);
copingStrategiesRouter.delete("/:id", deleteCopingStrategy);

export default copingStrategiesRouter;
