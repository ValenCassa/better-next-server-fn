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
  .use(async () => ({ step: 1 }))
  .use(async (context) => ({ ...context, step: 2 }))
  .use(async (context) => ({ ...context, step: 3 }))
  .handler(async ({ context }) => {
    return { finalStep: context.step };
  });
