import mongoose, { Schema, Document } from "mongoose";

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  plan: "monthly" | "yearly" | "one-time";
  status: "active" | "expired" | "cancelled";
  startDate: Date;
  endDate?: Date; // For recurring subscriptions
  paystackReference: string;
  amount: number; // Stored in kobo
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plan: {
      type: String,
      enum: ["monthly", "yearly", "one-time"],
      required: true,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    paystackReference: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISubscription>(
  "Subscription",
  subscriptionSchema
);
