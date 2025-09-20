"use server";

import { createServerFn } from "@/utils/create-server-fn";

/**
 * BASIC USAGE EXAMPLES
 * Simple server functions without validation or middleware
 */

// Just a handler
export const helloWorld = createServerFn().handler(async () => {
  return { message: "Hello, World!" };
});

// With context from middleware
export const withContext = createServerFn()
  .use(async () => ({ timestamp: Date.now() }))
  .handler(async ({ context }) => {
    return { message: "Request processed", timestamp: context.timestamp };
  });

// Multiple middleware (context flows through)
export const multipleMiddleware = createServerFn()
  .use(async () => ({ userId: "user-123" }))
  .use(async (context) => ({ ...context, timestamp: Date.now() })) // receives { userId: "user-123" }
  .use(async (context) => ({ ...context, requestId: "req-456" })) // receives { userId: "user-123", timestamp: 1234567890 }
  .handler(async ({ context }) => {
    // context = { userId: "user-123", timestamp: 1234567890, requestId: "req-456" }
    return { context };
  });
