import mongoose, { Document, Schema } from "mongoose";
import { normalizeToUTCDate } from "../../utils/dateManagement";

export interface ICopingUsage extends Document {
  userId: mongoose.Types.ObjectId | string;
  strategyId: mongoose.Types.ObjectId | string;
  usedAt?: Date;
  cravingIntensityBefore: number; // 1–10 scale
  cravingIntensityAfter?: number; // optional, if tracked
  triggerContext?:
    | "stress"
    | "boredom"
    | "loneliness"
    | "anxiety"
    | "habit"
    | "peer_pressure"
    | "other";
  environment?:
    | "home"
    | "work"
    | "school"
    | "public"
    | "social_event"
    | "other";
  notes?: string; // reflection or comments
  effectivenessRating?: number; // 1–5
}

const copingUsageSchema = new Schema<ICopingUsage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    strategyId: {
      type: Schema.Types.ObjectId,
      ref: "CopingStrategy",
      required: true,
    },

    usedAt: {
      type: Date,
      default: Date.now,
      set: normalizeToUTCDate,
    },

    cravingIntensityBefore: {
      type: Number,
      min: 1,
      max: 5,
    },

    cravingIntensityAfter: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    triggerContext: {
      type: String,
      enum: [
        "stress",
        "boredom",
        "loneliness",
        "anxiety",
        "habit",
        "peer_pressure",
        "other",
      ],
      default: "other",
    },

    environment: {
      type: String,
      enum: ["home", "work", "school", "public", "social_event", "other"],
      default: "home",
    },

    notes: {
      type: String,
      trim: true,
    },

    effectivenessRating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ICopingUsage>("CopingUsage", copingUsageSchema);
