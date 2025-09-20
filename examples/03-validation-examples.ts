"use server";

import { createServerFn, ValidationError } from "@/utils/create-server-fn";
import z from "zod";

/**
 * VALIDATION EXAMPLES
 * Shows Zod schemas vs custom validation functions
 */

// Zod validation - types both function call AND handler
export const createUser = createServerFn()
  .validate(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      age: z.number().min(18),
    })
  )
  .handler(async ({ input }) => {
    // input is fully typed: { name: string; email: string; age: number }
    return { user: input, id: Math.random().toString() };
  });

// Custom validation - flexible input, typed handler
export const uploadFile = createServerFn()
  .validate(async (data: unknown) => {
    if (!(data instanceof File)) {
      throw new ValidationError("Expected a file");
    }

    if (data.size > 1024 * 1024) {
      throw new ValidationError("File too large");
    }

    return { file: data, size: data.size };
  })
  .handler(async ({ input }) => {
    // input is typed: { file: File; size: number }
    return { uploaded: input.file.name, bytes: input.size };
  });

// FormData validation
export const processForm = createServerFn()
  .validate(async (data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new ValidationError("Expected FormData");
    }

    const name = data.get("name");
    const email = data.get("email");

    if (!name || typeof name !== "string") {
      throw new ValidationError("Name required");
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new ValidationError("Valid email required");
    }

    return { name, email };
  })
  .handler(async ({ input }) => {
    // input is typed: { name: string; email: string }
    return { processed: true, data: input };
  });
