"use server";

import { createServerFn } from "@/utils/create-server-fn";
import { authMiddleware, adminMiddleware } from "./middleware";
import z from "zod";

/**
 * AUTHENTICATION & REUSABLE INSTANCES
 * Shows how to create base server functions and extend them
 */

// Create reusable base server function (not exported - used internally)
const authServerFn = createServerFn().use(authMiddleware);

// Extend the base for specific endpoints
export const getProfile = authServerFn.handler(async ({ context }) => {
  return { profile: context.user };
});

export const updateProfile = authServerFn
  .validate(z.object({ name: z.string() }))
  .handler(async ({ input, context }) => {
    return { updated: input.name, userId: context.user.id };
  });

// Admin-only base
const adminServerFn = createServerFn().use(adminMiddleware);

export const deleteUser = adminServerFn
  .validate(z.object({ userId: z.string() }))
  .handler(async ({ input }) => {
    return { deleted: input.userId };
  });
