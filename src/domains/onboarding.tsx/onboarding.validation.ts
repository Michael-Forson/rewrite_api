// validation/onboarding.validation.ts
import { z } from "zod";

export const onboardingValidationSchema = z.object({
  addictionTypes: z
    .array(
      z.enum(["Alcohol", "Drugs", "Smoking", "Gambling", "Multiple", "Others"])
    )
    .min(1, "At least one addiction type is required"),

  duration: z.enum([
    "1-6 months",
    "6 months to 1 year",
    "1-3 years",
    "3+ years",
  ]),
  dailyImpact: z.enum(["Minimal", "Mild", "Moderate", "Significant"]),

  triggerSituations: z
    .array(
      z.enum([
        "Stress or anxiety",
        "Boredom",
        "Friends/Peers",
        "Loneliness",
        "Other",
      ])
    )
    .optional(),

  frequency: z
    .enum([
      "Multiple times a day",
      "Once a day",
      "Weekly",
      "Only when triggered",
      "Rarely / Occasionally",
    ])
    .optional(),

  triggerTimes: z
    .array(z.enum(["Mornings", "Afternoons", "Evenings", "Late nights"]))
    .optional(),

  triggerPlaces: z
    .array(
      z.enum([
        "At home",
        "At work or school",
        "Commuting",
        "Alone",
        "With others",
        "Other",
      ])
    )
    .optional(),

  primaryGoal: z.string().optional(),
  motivation: z.string().optional(),
  previousAttempts: z.string().optional(),
});

export type OnboardingValidatedInput = z.infer<
  typeof onboardingValidationSchema
>;
