"server-only";

import {
  UnauthorizedError,
  ForbiddenError,
  createServerFn,
} from "@/utils/create-server-fn";

/**
 * Simple reusable middleware for examples
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

// Mock auth function
async function getCurrentUser(): Promise<User | null> {
  return {
    id: "1",
    email: "test@example.com",
    name: "Test User",
    role: "user",
  };
}

async function getAdminUser(): Promise<User | null> {
  return {
    id: "2",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
  };
}

// Auth middleware
const authMiddleware = async () => {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Login required");
  return { user };
};

// Admin middleware
const adminMiddleware = async () => {
  const user = await getAdminUser();
  if (!user || user.role !== "admin")
    throw new ForbiddenError("Admin required");
  return { user, isAdmin: true };
};

export const authServerFn = createServerFn().use(authMiddleware);
export const adminServerFn = createServerFn()
  .use(authMiddleware)
  .use(adminMiddleware);
