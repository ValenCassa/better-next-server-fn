"use server";

import {
  createServerFn,
  UnauthorizedError,
  ValidationError,
  NotFoundError,
} from "@/utils/create-server-fn";
import z from "zod";
import { adminServerFn } from "./middleware";

/**
 * REAL-WORLD EXAMPLE
 * A complete blog post system showing all features working together
 */

interface User {
  id: string;
  email: string;
  name: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  published: boolean;
}

// Mock data
const mockUsers: User[] = [
  { id: "1", email: "author@example.com", name: "John Author" },
];

const mockPosts: Post[] = [
  {
    id: "1",
    title: "Hello World",
    content: "First post",
    authorId: "1",
    published: true,
  },
];

// Create a blog post
export const createPost = adminServerFn
  .validate(
    z.object({
      title: z.string().min(1, "Title required"),
      content: z.string().min(10, "Content too short"),
      published: z.boolean().default(false),
    })
  )
  .handler(async ({ input, context }) => {
    const post: Post = {
      id: `post_${Date.now()}`,
      title: input.title,
      content: input.content,
      authorId: context.user.id,
      published: input.published,
    };

    mockPosts.push(post);

    return {
      post,
      createdBy: context.user.email,
    };
  });

// Upload post image with FormData
export const uploadPostImage = adminServerFn
  .validate(async (data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new ValidationError("Expected FormData");
    }

    const postId = data.get("postId");
    const image = data.get("image");

    if (!postId || typeof postId !== "string") {
      throw new ValidationError("Post ID required");
    }

    if (!image || !(image instanceof File)) {
      throw new ValidationError("Image file required");
    }

    if (!image.type.startsWith("image/")) {
      throw new ValidationError("Must be an image file");
    }

    if (image.size > 2 * 1024 * 1024) {
      throw new ValidationError("Image must be under 2MB");
    }

    return { postId, image };
  })
  .handler(async ({ input, context }) => {
    const post = mockPosts.find((p) => p.id === input.postId);
    if (!post) {
      throw new NotFoundError("Post not found");
    }

    if (post.authorId !== context.user.id) {
      throw new UnauthorizedError("Not your post");
    }

    // Simulate image upload
    const imageUrl = `https://storage.example.com/images/${input.postId}/${input.image.name}`;

    return {
      imageUrl,
      postId: input.postId,
      uploadedBy: context.user.email,
      size: input.image.size,
    };
  });

// Get posts (public - no auth required)
export const getPosts = createServerFn()
  .validate(
    z.object({
      published: z.boolean().default(true),
      limit: z.number().min(1).max(100).default(10),
    })
  )
  .handler(async ({ input }) => {
    const filteredPosts = mockPosts
      .filter((post) => post.published === input.published)
      .slice(0, input.limit);

    return { posts: filteredPosts, count: filteredPosts.length };
  });

// Complex workflow: publish post and notify
export const publishPost = adminServerFn
  .validate(z.object({ postId: z.string() }))
  .handler(async ({ input, context }) => {
    const post = mockPosts.find((p) => p.id === input.postId);
    if (!post) {
      throw new NotFoundError("Post not found");
    }

    if (post.authorId !== context.user.id) {
      throw new UnauthorizedError("Not your post");
    }

    if (post.published) {
      throw new ValidationError("Post already published");
    }

    // Update post
    post.published = true;

    // Simulate sending notifications
    const notificationsSent = mockUsers.length - 1; // Everyone except author

    return {
      published: true,
      postId: input.postId,
      publishedBy: context.user.email,
      notificationsSent,
    };
  });
