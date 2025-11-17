// /validators/copingStrategy.validator.ts
import { z } from "zod";

// This schema validates the body for creating/updating a single strategy
export const copingStrategyValidationSchema = z.object({
  // userId is typically handled by auth middleware, not the body
  // userId: z.string().optional().nullable(), 

  strategyType: z
    .string("strategyType is required" )
    .trim()
    .min(1, "strategyType cannot be empty"),

  displayName: z
    .string( "displayName is required" )
    .trim()
    .min(1, "displayName cannot be empty"),

  description: z
    .string( "description is required" )
    .trim()
    .min(1, "description cannot be empty"),

  category: z.enum(
    [
      "cognitive",
      "behavioral",
      "mindfulness",
      "emotional",
      "social",
      "emergency",
      "physiological",
      "motivational",
    ]
  ),

  defaultDurationMinutes: z
    .number()
    .int()
    .positive()
    .optional(),

  difficultyLevel: z
    .enum(["beginner", "intermediate", "advanced"])
    .optional(),

  iconName: z.string().trim().min(1).optional(),

  requiresSetup: z.boolean().default(false).optional(),

  instructions: z
    .array(z.string().trim().min(1, "Instruction step cannot be empty"))
    .min(1, "At least one instruction is required"),

  isActive: z.boolean().default(true),

  tags: z.array(z.string().trim().min(1)).optional(),
  
  // Note: averageEffectiveness is typically calculated, not set by the user
});

// To validate the entire MASTER_STRATEGIES array (e.g., for the seed script)
export const masterStrategyArraySchema = z.array(copingStrategyValidationSchema);
