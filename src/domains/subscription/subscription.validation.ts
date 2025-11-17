import z from "zod";

export const paymentValidationSchema = z.object({
  inteval: z.enum(["monthly", "yearly"]),
});
