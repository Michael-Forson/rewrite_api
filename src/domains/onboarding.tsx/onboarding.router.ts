// routes/onboardingRoutes.ts
import { Router } from "express";
import { createOrUpdateOnboarding } from "./onboarding.controller";
import { authMiddleware } from "../../middleware/authMiddleware";
import { validateRequestWithZod } from "../../middleware/zodValidationMiddleware";
import { onboardingValidationSchema } from "./onboarding.validation";

const onboardingRouter: Router = Router();

onboardingRouter.post(
  "/",
  authMiddleware,
  validateRequestWithZod(onboardingValidationSchema),
  createOrUpdateOnboarding
);

export default onboardingRouter;
