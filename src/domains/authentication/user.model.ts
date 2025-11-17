import mongoose, { Document, Schema, CallbackError, Model } from "mongoose";
import bcrypt from "bcrypt";
import { normalizeToUTCDate } from "../../utils/dateManagement";

// Define the interface for the User document
export interface IUserDocument extends Document {
  username: string;
  email: string;
  role: string;
  googleId?: string;
  mobile?: string;
  password?: string;
  isBlocked: boolean;
  isSubscribed: boolean;
  refreshToken?: string;
  accessToken?: string;
  recoveryStartDate: Date; // Added for milestone tracking
  currentMilestoneStartDate?: Date; // Track current milestone period start
  isPasswordMatched(enteredPassword: string): Promise<boolean>;
  paystackCustomerCode?: string;
  trialEndAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define schema
const userSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "user",
    },
    googleId: {
      type: String,
      sparse: true,
    },
    mobile: {
      type: String,
      sparse: true,
    },
    password: {
      type: String,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isSubscribed: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
    },
    recoveryStartDate: {
      type: Date,
      required: true,
      default: () => {
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        return now;
      },
    },
    currentMilestoneStartDate: {
      type: Date,
    },
    paystackCustomerCode: {
      type: String,
    },
    trialEndAt: {
      type: Date,
      default: function () {
        const baseDate = normalizeToUTCDate(new Date());
        const adjusted = new Date(baseDate);
        adjusted.setDate(adjusted.getDate() + 7);
        return adjusted;
      },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to hash password
userSchema.pre<IUserDocument>(
  "save",
  async function (next: (err?: CallbackError) => void) {
    const currentUser = this;

    if (currentUser.password && currentUser.isModified("password")) {
      try {
        const hashSaltRounds = 10;
        currentUser.password = await bcrypt.hash(
          currentUser.password,
          hashSaltRounds
        );
      } catch (hashError) {
        return next(hashError as CallbackError);
      }
    }

    next();
  }
);

// Schema method to check if passwords match
userSchema.methods.isPasswordMatched = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password || "");
};

// Export model
export default mongoose.model("User", userSchema);
