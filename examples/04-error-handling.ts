"use server";

import {
  createServerFn,
  ServerFnError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "@/utils/create-server-fn";
import z from "zod";

/**
 * ERROR HANDLING EXAMPLES
 * Shows different error types and custom error classes
 */

// Built-in error types
export const demonstrateErrors = createServerFn()
  .validate(
    z.object({
      errorType: z.enum([
        "validation",
        "unauthorized",
        "forbidden",
        "not_found",
        "custom",
      ]),
    })
  )
  .handler(async ({ input }) => {
    switch (input.errorType) {
      case "validation":
        throw new ValidationError("Form is invalid", [
          "Name required",
          "Email invalid",
        ]);

      case "unauthorized":
        throw new UnauthorizedError("Please log in");

      case "forbidden":
        throw new ForbiddenError("Access denied");

      case "not_found":
        throw new NotFoundError("User not found");

      case "custom":
        throw new ServerFnError("Something went wrong", "BUSINESS_ERROR");

      default:
        return { success: true };
    }
  });

// Custom error class
class PaymentError extends ServerFnError {
  constructor(message: string = "Payment failed") {
    super(message, "PAYMENT_ERROR");
    this.name = "PaymentError";
  }
}

export const processPayment = createServerFn()
  .validate(
    z.object({
      amount: z.number().positive(),
      cardNumber: z.string(),
    })
  )
  .handler(async ({ input }) => {
    if (input.cardNumber === "4000000000000002") {
      throw new PaymentError("Card declined");
    }

    return { charged: input.amount, success: true };
  });

// Hard errors (these crash - not gracefully handled)
export const demonstrateHardError = createServerFn().handler(async () => {
  // This throws a regular Error, not ServerFnError
  // It will crash and need to be caught by error boundary
  throw new Error("System failure - this crashes!");
});
