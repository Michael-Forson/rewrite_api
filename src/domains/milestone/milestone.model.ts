import mongoose, { Schema, Document } from "mongoose";

export interface IMilestoneDocument extends Document {
  userId: mongoose.Types.ObjectId;
  milestoneDays: number;
  status: "pending" | "completed" | "failed";
  startDate: Date;
  endDate: Date;
  completionPercentage: number;
  relapsePercentage: number;
  totalCheckIns: number;
  totalRelapses: number;
  medal?: "gold" | "silver" | "bronze";
  achievedDate?: Date;
  attemptNumber: number;
}

const milestoneSchema = new Schema<IMilestoneDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    milestoneDays: {
      type: Number,
      required: true,
      enum: [7, 14, 30, 60, 90, 180, 365],
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    completionPercentage: { type: Number, default: 0 },
    relapsePercentage: { type: Number, default: 0 },
    totalCheckIns: { type: Number, default: 0 },
    totalRelapses: { type: Number, default: 0 },
    medal: {
      type: String,
      enum: ["gold", "silver", "bronze"],
    },
    achievedDate: { type: Date },
    attemptNumber: { type: Number, default: 1 },
  },
  { timestamps: true }
);

milestoneSchema.index({ userId: 1, milestoneDays: 1, status: 1 });
milestoneSchema.index({ userId: 1, createdAt: -1 });

export const Milestone = mongoose.model<IMilestoneDocument>(
  "Milestone",
  milestoneSchema
);