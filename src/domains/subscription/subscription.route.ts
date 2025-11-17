import { raw, Router } from "express";
import {
  initializePaymentController,
  paystackWebhookHandler,
  verifyPaymentController,
} from "./subscription.controller";
import { authMiddleware } from "../../middleware/authMiddleware"; // Assuming you have this
import { verifyPaystackSignature } from "./paystack.middleware";
import { validateRequestWithZod } from "../../middleware/zodValidationMiddleware";
import { paymentValidationSchema } from "./subscription.validation";

const paymentRouter = Router();

/**
 * @route   POST /v1/payment/initialize
 * @desc    Initialize a subscription payment
 * @access  Private (User must be logged in)
 */
paymentRouter.post(
  "/initialize",
  authMiddleware,
  validateRequestWithZod(paymentValidationSchema),
  initializePaymentController
);


/**
 * @route   GET /v1/payment/verify
 * @desc    Paystack callback URL to verify payment
 * @access  Public (Accessed by Paystack redirect)
 */
paymentRouter.get("/verify", verifyPaymentController);

/**
 * @route   POST /v1/payment/webhook
 * @desc    Paystack webhook listener
 * @access  Public (Secured by signature)
 */
paymentRouter.post(
  "/webhook",
  // 1. Use express.raw() to get the raw body as a Buffer
  // We must do this *before* the JSON parser middleware.
  raw({
    type: "application/json",
    verify: (req: any, res, buf) => {
      // 2. Attach the raw buffer to the request object for our middleware
      req.buf = buf;
    },
  }),
  // 3. Verify the signature
  verifyPaystackSignature,
  // 4. If valid, run the handler
  paystackWebhookHandler
);
export default paymentRouter;
