import { Router } from "express";
import {
  backfillMultipleDailyCheckIns,
  createDailyCheckIn,
} from "./dailycheckIn.controller";
import { authMiddleware } from "../../middleware/authMiddleware";
import { validateRequestWithZod } from "../../middleware/zodValidationMiddleware";
import { dailyCheckInSchemaZod, multipleBackfillSchema } from "./dailycheckIn.validation";

const dailyCheckInRouter: Router = Router();
dailyCheckInRouter.use(authMiddleware)
dailyCheckInRouter.post(
  "/daily",
  validateRequestWithZod(dailyCheckInSchemaZod),
  createDailyCheckIn
);
dailyCheckInRouter.post(
  "/backfill",
  validateRequestWithZod(multipleBackfillSchema),
  backfillMultipleDailyCheckIns
);

export default dailyCheckInRouter