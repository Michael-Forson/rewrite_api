import mongoose, { Schema, Document } from "mongoose";

export interface DailyCheckInDocument extends Document {
  userId: mongoose.Types.ObjectId;
  moodLevel: number;
  energyLevel: number;
  cravingLevel: number;
  urgeLevel: number;
  triggers: string[];
  copingStrategies: string[];
  relapse: boolean;
  isBackfill: boolean;
  note?: string;
  checkInDate: Date;
}

const dailyCheckInSchema = new Schema<DailyCheckInDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    moodLevel: { type: Number, required: true, min: 1, max: 5 },
    energyLevel: { type: Number, required: true, min: 0, max: 5 },
    urgeLevel: { type: Number, required: true, min: 0, max: 5 },
    triggers: [{ type: String }],
    copingStrategies: [{ type: String }],
    relapse: { type: Boolean },
    isBackfill: { type: Boolean, default: false },
    checkInDate: { type: Date, required: true },

    note: { type: String, trim: true },
  },
  { timestamps: true }
);
dailyCheckInSchema.index({ userId: 1, checkInDate: 1 }, { unique: true });

export const DailyCheckIn = mongoose.model<DailyCheckInDocument>(
  "DailyCheckIn",
  dailyCheckInSchema
);
