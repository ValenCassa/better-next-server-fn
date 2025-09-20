"use server";

import z from "zod";
import { adminServerFn, authServerFn } from "./middleware";

/**
 * AUTHENTICATION & REUSABLE INSTANCES
 * Shows how to create base server functions and extend them
 */

// Extend the base for specific endpoints
export const getProfile = authServerFn.handler(async ({ context }) => {
  return { profile: context.user };
});

export const updateProfile = authServerFn
  .validate(z.object({ name: z.string() }))
  .handler(async ({ input, context }) => {
    return { updated: input.name, userId: context.user.id };
  });

export const deleteUser = adminServerFn
  .validate(z.object({ userId: z.string() }))
  .handler(async ({ input }) => {
    return { deleted: input.userId };
  });
