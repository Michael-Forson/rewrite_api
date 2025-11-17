// models/UserOnboarding.ts
import mongoose, { Document, Schema } from "mongoose";
import {
  AddictionType,
  AddictionDuration,
  DailyImpact,
  TriggerSituation,
  AddictionFrequency,
  TriggerTime,
  TriggerPlace,
} from "./onboarding.types";

export interface UserOnboardingDocument extends Document {
  userId: mongoose.Types.ObjectId;
  addictionTypes: AddictionType[];
  duration: AddictionDuration;
  dailyImpact: DailyImpact;
  triggerSituations?: TriggerSituation[];
  frequency?: AddictionFrequency;
  triggerTimes?: TriggerTime[];
  triggerPlaces?: TriggerPlace[];
  primaryGoal?: string;
  motivation?: string;
  previousAttempts?: string;

  createdAt: Date;
}

const onboardingSchema = new Schema<UserOnboardingDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addictionTypes: {
      type: [String],
      enum: ["Alcohol", "Drugs", "Smoking", "Gambling", "Multiple", "Others"],
      required: true,
    },
    duration: {
      type: String,
      enum: ["1-6 months", "6 months to 1 year", "1-3 years", "3+ years"],
      required: true,
    },
    dailyImpact: {
      type: String,
      enum: ["Minimal", "Mild", "Moderate", "Significant"],
      required: true,
    },
    triggerSituations: {
      type: [String],
      enum: ["Stress or anxiety", "Boredom", "Friends", "Loneliness", "Other"],
    },
    frequency: {
      type: String,
      enum: [
        "Multiple times a day",
        "Once a day",
        "Weekly",
        "Only when triggered",
        "Rarely / Occasionally",
      ],
    },
    triggerTimes: {
      type: [String],
      enum: ["Mornings", "Afternoons", "Evenings", "Late nights"],
    },
    triggerPlaces: {
      type: [String],
      enum: [
        "At home",
        "At work or school",
        "Commuting",
        "Alone",
        "With others",
        "Other",
      ],
    },
    primaryGoal: { type: String },
    motivation: { type: String },
    previousAttempts: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("UserOnboarding", onboardingSchema);
