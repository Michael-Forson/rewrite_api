import { Request, Response } from "express";
import { PaymentService, VerifyPaymentData } from "./subscription.service";
import User, { IUserDocument } from "../../domains/authentication/user.model"; // Adjust path
import Subscription from "./subscription.model";
// Assuming you have middleware to get the authenticated user (e.g., req.user)
// We'll define a type for it.

export const initializePaymentController = async (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user;
    if (!user) {
      throw new Error("User not Authorized");
    }
    let planCode: string;
    const { interval } = req.body;
    if (interval === "monthly") {
      planCode = "PLN_a4ti4meewg4sl75";
    } else if (interval === "yearly") {
      planCode = "PLN_jfhou9q76pl9vtn";
    } else {
      // 4. (Recommended) Handle an invalid interval
      return res.status(400).json({
        success: false,
        message:
          "Invalid subscription interval. Must be 'monthly' or 'yearly'.",
      });
    }
    // Define the callback URL for this transaction
    const callbackUrl = `${process.env.API_BASE_URL}/api/v1/payment/verify`;

    const paymentData = await PaymentService.initializeSubscription(
      user,
      callbackUrl,
      planCode
    );

    return res.status(200).json({
      success: true,
      message: "Payment initialized",
      authorizationUrl: paymentData.authorization_url,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};
export const createDirectSubscriptionController = async (
  req: Request,
  res: Response
) => {
  try {
    let planCode: string;
    const { interval } = req.body;
    if (interval === "monthly") {
      planCode = "PLN_a4ti4meewg4sl75";
    } else if (interval === "yearly") {
      planCode = "PLN_jfhou9q76pl9vtn";
    } else {
      // 4. (Recommended) Handle an invalid interval
      return res.status(400).json({
        success: false,
        message:
          "Invalid subscription interval. Must be 'monthly' or 'yearly'.",
      });
    }
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }
    const subscriptionData = await PaymentService.createDirectSubscription(
      user,
      planCode
    );

    // If successful, the webhook (subscription.create) will handle activation.
    return res.status(200).json({
      success: true,
      message:
        "Subscription creation attempted successfully. Waiting for webhook confirmation.",
      data: subscriptionData,
    });
  } catch (error: any) {
    // This will catch the "customer has no active authorization" error
    return res.status(400).json({
      // 400 Bad Request is better than 500
      success: false,
      message: error.message,
    });
  }
};

export const verifyPaymentController = async (req: Request, res: Response) => {
  const { reference } = req.query;
  const frontendSuccessUrl = `${process.env.APP_BASE_URL}/payment-success?status=true`;
  const frontendFailedUrl = `${process.env.APP_BASE_URL}/payment-failed`;

  if (!reference || typeof reference !== "string") {
    return res.status(400).redirect(`${frontendFailedUrl}?error=no_reference`);
  }

  try {
    const transactionDetails = await PaymentService.verifyTransaction(
      reference
    );

    if (transactionDetails && transactionDetails.status === "success") {
      // Payment is verified. Now, update the user.
      const userId = transactionDetails.metadata.userId;
      const user = await User.findById(userId);

      if (user) {
        user.isSubscribed = true;
        await user.save();

        // TODO: Create a record of the subscription (e.g., in a new 'Subscription' model)

        // Redirect user to a success page on the frontend
        return res.redirect(frontendSuccessUrl);
      } else {
        // Edge case: User not found (should be investigated)
        console.error(`Verified payment for non-existent user: ${userId}`);
        return res.redirect(`${frontendFailedUrl}?error=user_not_found`);
      }
    } else {
      // Payment failed or is pending
      return res.redirect(`${frontendFailedUrl}?error=payment_failed`);
    }
  } catch (error) {
    console.error("Verification controller error:", error);
    return res.redirect(`${frontendFailedUrl}?error=verification_error`);
  }
};

export const paystackWebhookHandler = async (req: Request, res: Response) => {
  const event = req.body;
  const eventData = event.data;

  console.log(`Received Paystack event: ${event.event}`);

  try {
    switch (event.event) {
      /**
       * Fired when the first payment is made and a new subscription is created.
       * This is the main event for activating a recurring subscription.
       */
      case "subscription.create": {
        const {
          subscription_code,
          amount,
          customer,
          next_payment_date,
          metadata,
          plan,
        } = eventData;
        // Find user by email
        const user = await User.findById(metadata.userId);
        if (!user) {
          console.error(
            `Webhook Error: User not found with email ${customer.email}`
          );
          // Still send 200 so Paystack doesn't retry
          return res.sendStatus(200);
        }

        // Check if subscription is already processed
        const existingSub = await Subscription.findOne({
          paystackReference: subscription_code,
        });
        if (existingSub) {
          console.warn(
            `Webhook Warning: Subscription ${subscription_code} already processed.`
          );
          return res.sendStatus(200);
        }

        // Create new Subscription record
        await Subscription.create({
          userId: user._id,
          plan: plan.interval,
          status: "active",
          paystackReference: subscription_code, // Store the subscription code
          amount: amount,
          startDate: new Date(eventData.created_at),
          endDate: new Date(next_payment_date),
        });

        // Update user
        user.isSubscribed = true;
        user.paystackCustomerCode = customer.customer_code;
        await user.save();

        console.log(
          `Subscription ${subscription_code} created for user ${user.email}`
        );
        break;
      }

      /**
       * Fired when a subscription is manually disabled by admin or user.
       */
      case "subscription.disable": {
        const { customer, subscription_code } = eventData;

        const user = await User.findOne({
          paystackCustomerCode: customer.customer_code,
        });
        if (!user) {
          console.error(
            `Webhook Error: User not found with customer code ${customer.customer_code}`
          );
          return res.sendStatus(200);
        }

        // Deactivate subscription
        await Subscription.findOneAndUpdate(
          { paystackReference: subscription_code, status: "active" },
          { $set: { status: "cancelled" } }
        );

        // Check if user has any other active subscriptions (unlikely, but good practice)
        const activeSubs = await Subscription.countDocuments({
          userId: user._id,
          status: "active",
        });
        if (activeSubs === 0) {
          user.isSubscribed = false;
          await user.save();
        }

        console.log(
          `Subscription ${subscription_code} disabled for user ${user.email}`
        );
        break;
      }

      /**
       * Fired when a renewal payment fails (e.g., expired card).
       * This is how we handle "Subscriptions with Expiring Cards".
       */
      case "invoice.payment_failed": {
        // This event is for failed *renewal* invoices
        const { customer, subscription } = eventData;
        if (!subscription) {
          console.log(
            "Invoice payment failed, but not for a subscription. Ignoring."
          );
          return res.sendStatus(200);
        }

        const user = await User.findOne({
          paystackCustomerCode: customer.customer_code,
        });
        if (!user) {
          console.error(
            `Webhook Error: User not found with customer code ${customer.customer_code}`
          );
          return res.sendStatus(200);
        }

        // Set subscription status to expired
        await Subscription.findOneAndUpdate(
          {
            paystackReference: subscription.subscription_code,
            status: "active",
          },
          { $set: { status: "expired" } } // 'expired' or 'payment_failed'
        );

        // Check for other active subs
        const activeSubs = await Subscription.countDocuments({
          userId: user._id,
          status: "active",
        });
        if (activeSubs === 0) {
          user.isSubscribed = false;
          await user.save();
        }

        console.log(
          `Renewal payment failed for sub ${subscription.subscription_code}. User ${user.email} deactivated.`
        );
        // TODO: Trigger an email or in-app notification to the user to update their card.
        break;
      }

      /**
       * Fired when user opts out of auto-renewal.
       * Their subscription is still valid until the end of the current period.
       */
      case "subscription.not_renew": {
        const { subscription_code } = eventData;

        // We don't need to deactivate the user yet.
        // We can just update our record to reflect this.
        await Subscription.findOneAndUpdate(
          { paystackReference: subscription_code },
          { $set: { status: "cancelled" } } // Or add a new 'autoRenew: false' field
        );
        console.log(`Subscription ${subscription_code} set to not auto-renew.`);
        break;
      }

      case "charge.success": {
        const transactionData = event.data;

        // --- THIS IS THE KEY LOGIC ---
        // If this charge is part of a subscription, the 'subscription'
        // object will exist. If it does, we IGNORE this event
        // because 'subscription.create' is our primary handler for that.
        if (
          transactionData.subscription &&
          transactionData.subscription.subscription_code
        ) {
          console.log(
            `[Paystack] charge.success for subscription ${transactionData.subscription.subscription_code}. Ignoring, as 'subscription.create' will handle.`
          );

          // Acknowledge the event and stop processing
          return res.sendStatus(200);
        }
        // --- END KEY LOGIC ---

        // If we are here, this is a one-time payment (not a subscription).
        // We will process it using our 'activateSubscription' service
        // which uses the transaction reference for idempotency.

        console.log(
          `[Paystack] charge.success for one-time payment ${transactionData.reference}. Processing...`
        );

        // Re-verify the transaction for security
        const verifiedDetails = await PaymentService.verifyTransaction(
          transactionData.reference
        );

        if (verifiedDetails && verifiedDetails.status === "success") {
          // This service is idempotent and will prevent duplicates
          // by checking the paystackReference.
          await PaymentService.activateSubscription(verifiedDetails);
        } else {
          console.warn(
            `[Paystack] charge.success: Re-verification failed for ${transactionData.reference}`
          );
        }

        break; // Break from the switch case
      }

      case "invoice.create": {
        const { customer, subscription } = eventData;

        // We only care about invoices tied to a subscription
        if (subscription && subscription.subscription_code) {
          const user = await User.findOne({
            paystackCustomerCode: customer.customer_code,
          });
          if (!user) {
            console.error(
              `[Paystack] invoice.create: User not found with customer code ${customer.customer_code}`
            );
            return res.sendStatus(200);
          }

          console.log(
            `[Paystack] Upcoming payment invoice created for user ${user.email} (Sub: ${subscription.subscription_code})`
          );

          // TODO: You could trigger an in-app notification or email here
          // e.g., "Your subscription is due for renewal on [date]."
        }
        break;
      }

      /**
       * Fired when an invoice is updated (e.g., payment success/failure).
       * We use this to handle successful renewals.
       */
      case "invoice.update": {
        const { customer, subscription, status } = eventData;

        // We only care about *paid* invoices for *subscriptions*
        if (
          status === "paid" &&
          subscription &&
          subscription.subscription_code
        ) {
          const user = await User.findOne({
            paystackCustomerCode: customer.customer_code,
          });
          if (!user) {
            console.error(
              `[Paystack] invoice.update: User not found with customer code ${customer.customer_code}`
            );
            return res.sendStatus(200);
          }

          // Find the subscription in our DB
          const activeSub = await Subscription.findOneAndUpdate(
            { paystackReference: subscription.subscription_code },
            {
              $set: {
                status: "active",
                endDate: new Date(subscription.next_payment_date), // Update the expiry date
              },
            },
            { new: true } // Return the updated document
          );

          // Also update the user's main flag
          user.isSubscribed = true;
          await user.save();

          console.log(
            `[Paystack] Successful renewal for user ${user.email} (Sub: ${subscription.subscription_code}). New end date: ${subscription.next_payment_date}`
          );
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.event}`);
    }
  } catch (error) {
    console.error(`Webhook Error processing event ${event.event}:`, error);
    // Send 500 so Paystack might retry
    return res.status(500).send("Webhook processing error");
  }

  // **CRITICAL**: Always send 200 OK back to Paystack
  res.sendStatus(200);
};
function elseIf(interval: any) {
  throw new Error("Function not implemented.");
}
