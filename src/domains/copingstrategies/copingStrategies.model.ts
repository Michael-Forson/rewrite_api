import mongoose, { Document, Schema } from "mongoose";

export interface ICopingStrategy extends Document {
  userId?: mongoose.Types.ObjectId | null;
  strategyType: string; // e.g. 'urge_surfing', 'deep_breathing'
  displayName: string; // Human-friendly title
  description: string;
  category:
    | "cognitive"
    | "behavioral"
    | "mindfulness"
    | "emotional"
    | "social"
    | "emergency"
    | "physiological"
    | "motivational";
  defaultDurationMinutes?: number;
  difficultyLevel?: "beginner" | "intermediate" | "advanced";
  iconName?: string;
  requiresSetup?: boolean;
  instructions: string[];
  isActive: boolean;
  tags?: string[];
  triggersHelped?: (
    | "stress"
    | "boredom"
    | "loneliness"
    | "anxiety"
    | "habit"
    | "peer_pressure"
  )[];
  averageEffectiveness?: number;
}

const copingStrategySchema = new Schema<ICopingStrategy>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    strategyType: {
      type: String,
      required: true,
      trim: true,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "cognitive",
        "behavioral",
        "mindfulness",
        "emotional",
        "social",
        "emergency",
        "physiological",
        "motivational",
      ],
      required: true,
    },

    defaultDurationMinutes: {
      type: Number,
      default: 10,
    },

    difficultyLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    iconName: {
      type: String,
      default: "default_icon",
    },

    requiresSetup: {
      type: Boolean,
      default: false,
    },

    instructions: {
      type: [String],
      required: true,
      validate: {
        validator: (arr: string[]) => arr.length > 0,
        message: "Instructions must include at least one step.",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    averageEffectiveness: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
  },
  { timestamps: true }
);

export const CopingStrategyModel = mongoose.model<ICopingStrategy>(
  "CopingStrategy",
  copingStrategySchema
);
