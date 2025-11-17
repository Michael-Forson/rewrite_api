import axios from "axios";
import User, { IUserDocument } from "../authentication/user.model"; // Adjust path as needed
import { JwtUser } from "../../types/express";
import Subscription from "./subscription.model";

// Create an Axios instance pre-configured for Paystack
const paystackAxios = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

// Define the subscription plan
// In a real app, you might pull this from a DB or config
const SUBSCRIPTION_AMOUNT_USD = 100; // e.g., 5000 NGN
const SUBSCRIPTION_AMOUNT_KOBO = SUBSCRIPTION_AMOUNT_USD * 100; // Paystack works in kobo

// Type definitions for Paystack responses
interface InitializePaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyPaymentData {
  status: "success" | "failed" | "abandoned";
  reference: string;
  amount: number;
  customer: {
    email: string;
    customer_code: string;
  };
  metadata: {
    userId: string;
  };
  // ...other details
}

interface VerifyPaymentResponse {
  status: boolean;
  message: string;
  data: VerifyPaymentData;
}

export class PaymentService {
  /**
   * Initializes a payment transaction with Paystack.
   */
  public static async initializeSubscription(
    user: JwtUser,
    callbackUrl: string,
    planCode: string
  ) {
    try {
      const response = await paystackAxios.post<InitializePaymentResponse>(
        "/transaction/initialize",
        {
          email: user.email,
          amount: SUBSCRIPTION_AMOUNT_KOBO,
          plan: planCode,
          // We pass the userId in metadata to identify the user on webhook/callback
          metadata: {
            userId: user.id.toString(),
            username: user.username,
          },
          callback_url: callbackUrl,
        }
      );

      if (response.data && response.data.status) {
        return response.data.data; // { authorization_url, access_code, reference }
      }
      throw new Error("Failed to initialize Paystack transaction");
    } catch (error) {
      console.error("Paystack initialization error:", error);
      throw new Error("Payment initialization failed.");
    }
  }
  /**
   * Creates a direct subscription using the POST /subscription endpoint.
   * WARNING: This will ONLY work for customers who ALREADY have a
   * saved payment method (authorization) on Paystack.
   */
  public static async createDirectSubscription(
    user: IUserDocument,
    planCode: string
  ) {
    try {
      if (!planCode) {
        throw new Error(
          "Payment configuration error: PAYSTACK_PLAN_CODE not set."
        );
      }

      // Use 'any' for the response type to keep it simple
      const response = await paystackAxios.post<any>("/subscription", {
        customer: user.paystackCustomerCode || user.email,
        plan: planCode,
      });

      // Now we can access .status, .message, etc. without TS errors
      if (response.data && response.data.status) {
        console.log(
          "Direct subscription API call successful:",
          response.data.message
        );
        return response.data.data; // Returns the subscription object
      }
      throw new Error(response.data.message || "Failed to create subscription");
    } catch (error: any) {
      // Use 'any' for the error type

      // This simple error handling will now work
      const errorMessage = error.response?.data?.message || error.message;

      console.error("Direct subscription error:", errorMessage);
      throw new Error(`Subscription failed: ${errorMessage}`);
    }
  }

  /**
   * Verifies a payment transaction with Paystack.
   * This is a critical server-to-server check.
   */
  public static async verifyTransaction(
    reference: string
  ): Promise<VerifyPaymentData | null> {
    try {
      const response = await paystackAxios.get<VerifyPaymentResponse>(
        `/transaction/verify/${reference}`
      );

      if (response.data && response.data.status) {
        return response.data.data; // Full transaction details
      }
      return null;
    } catch (error) {
      console.error("Paystack verification error:", error);
      return null;
    }
  }

  public static async activateSubscription(
    transactionDetails: VerifyPaymentData
  ) {
    const { reference, amount, metadata } = transactionDetails;
    const userId = metadata.userId;

    // 1. Check if this transaction has already been processed
    const existingSubscription = await Subscription.findOne({
      paystackReference: reference,
    });
    if (existingSubscription) {
      console.log(`Subscription for reference ${reference} already processed.`);
      return existingSubscription;
    }

    // 2. Find the user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found for ID: ${userId}`);
    }

    // 3. Create the new subscription record
    const newSubscription = new Subscription({
      userId: user._id,
      plan: "monthly", // Or determine from 'amount'
      status: "active",
      paystackReference: reference,
      amount: amount, // Amount is in Kobo
      startDate: new Date(),
      // endDate is set by default in the model
    });

    // 4. Update the User model
    user.isSubscribed = true;

    // 5. Save both in a transaction (if using replica sets in production)
    // For simplicity here, we'll save them sequentially.
    await newSubscription.save();
    await user.save();

    console.log(`Successfully activated subscription for user ${user.email}`);
    return newSubscription;
  }
}

/**
 * Finds all active subscriptions that have expired and deactivates them.
 * This is intended to be run as a scheduled task (cron job).
 */
export const deactivateExpiredSubscriptions = async () => {
  const now = new Date();
  console.log(
    `[Cron Job] Running deactivateExpiredSubscriptions at ${now.toISOString()}`
  );

  try {
    // 1. Find all subscriptions that are 'active' but their 'endDate' is in the past
    const expiredSubscriptions = await Subscription.find({
      status: "active",
      endDate: { $lt: now }, // $lt = less than (in the past)
    });

    if (expiredSubscriptions.length === 0) {
      console.log("[Cron Job] No expired subscriptions found.");
      return;
    }

    console.log(
      `[Cron Job] Found ${expiredSubscriptions.length} subscriptions to expire.`
    );

    // 2. Get all unique user IDs from these subscriptions
    const userIdsToDeactivate = Array.from(
      // <-- Change is here
      new Set(expiredSubscriptions.map((sub) => sub.userId.toString()))
    );
    // 3. Update the subscriptions
    await Subscription.updateMany(
      { _id: { $in: expiredSubscriptions.map((sub) => sub._id) } },
      { $set: { status: "expired" } }
    );

    // 4. Update the users
    // We only set isSubscribed = false IF they have no other active subscriptions
    // (This is a complex but correct edge case)
    for (const userId of userIdsToDeactivate) {
      const activeSubCount = await Subscription.countDocuments({
        userId: userId,
        status: "active",
        endDate: { $gt: now }, // Check for any *other* valid subs
      });

      if (activeSubCount === 0) {
        // No other active subs found, deactivate the user
        await User.findByIdAndUpdate(userId, { $set: { isSubscribed: false } });
        console.log(`[Cron Job] Deactivated subscription for user ${userId}.`);
      }
    }

    console.log("[Cron Job] Finished deactivating subscriptions.");
  } catch (error) {
    console.error("[Cron Job] Error during subscription deactivation:", error);
  }
};
