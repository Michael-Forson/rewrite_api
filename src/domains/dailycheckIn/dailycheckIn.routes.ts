import { Router } from "express";
import {
  backfillMultipleDailyCheckIns,
  createDailyCheckIn,
} from "./dailycheckIn.controller";
import { authMiddleware } from "../../middleware/authMiddleware";
import { validateRequestWithZod } from "../../middleware/zodValidationMiddleware";
import { dailyCheckInSchemaZod, multipleBackfillSchema } from "./services/dailycheckIn.validation";

const dailyCheckInRouter: Router = Router();

dailyCheckInRouter.post(
  "/daily",
  authMiddleware,
  validateRequestWithZod(dailyCheckInSchemaZod),
  createDailyCheckIn
);
dailyCheckInRouter.post(
  "/backfill",
  authMiddleware,
  validateRequestWithZod(multipleBackfillSchema),
  backfillMultipleDailyCheckIns
);

export default dailyCheckInRouter