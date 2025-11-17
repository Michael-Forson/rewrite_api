import { z } from "zod";

export const dailyCheckInSchemaZod = z.object({
  moodLevel: z.number().min(1).max(5),
  energyLevel: z.number().min(0).max(5),
  urgeLevel: z.number().min(0).max(5),
  triggers: z.array(z.string()).optional(),
  copingStrategies: z.array(z.string()).optional(),
  relapse: z.boolean(),
  isBackfill: z.boolean().optional(),
  note: z.string().max(500).optional(),
  checkInDate: z.string().optional(),
});

export const multipleBackfillSchema = z
  .array(dailyCheckInSchemaZod)
  .min(1, "At least one check-in is required")
  .max(3, "You can only backfill up to 3 days at a time");
