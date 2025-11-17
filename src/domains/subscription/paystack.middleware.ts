import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Middleware to verify that a webhook request is genuinely from Paystack.
 */
export const verifyPaystackSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("PAYSTACK_SECRET_KEY is not set.");
    return res.status(500).send("Webhook configuration error.");
  }

  // Get the signature from the header
  const signature = req.headers["x-paystack-signature"];
  if (!signature) {
    return res.status(401).send("Webhook Error: No signature provided.");
  }

  // Use the raw body, which we'll get from the 'buf' property
  // This 'buf' property is attached by the express.raw() middleware
  const rawBody = (req as any).buf;
  if (!rawBody) {
    return res.status(400).send("Webhook Error: No raw body found.");
  }

  // Calculate the hash
  const hash = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  // Compare the hash with the signature
  if (hash === signature) {
    // Signature is valid. Parse the body and attach it.
    try {
      req.body = JSON.parse(rawBody.toString());
      return next();
    } catch (e) {
      return res.status(400).send("Webhook Error: Invalid JSON body.");
    }
  } else {
    // Signature is invalid
    console.warn("Invalid Paystack signature received.");
    return res.status(401).send("Webhook Error: Invalid signature.");
  }
};

export const checkSubscription = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required." });
  }

  if (req.user.isSubscribed) {
    // User is subscribed, allow access
    return next();
  }
  // 2. If not, check if they are on their free trial
  if (req.user.trialEndsAt && req.user.trialEndsAt > new Date()) {
    // User is on trial, allow access
    return next();
  }

  // --- Advanced Check (Optional but Recommended) ---
  // You could also re-validate against the Subscription collection here
  // to check the endDate, but for performance, the flag is faster.
  // A cron job should run daily to set user.isSubscribed = false
  // for expired subscriptions.
  // ---

  return res.status(403).json({
    success: false,
    message:
      "Access denied. A premium subscription is required for this feature.",
  });
};
