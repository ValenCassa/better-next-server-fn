/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

/**
 * Server Function Helper for Next.js
 *
 * This module provides a fluent API for creating server functions with:
 * - Sequential middleware execution with type-safe context chaining
 * - Flexible validation (Zod schemas or custom functions)
 * - Standardized error handling with soft errors
 * - Consistent response format: { ok: boolean, data?: T, code?: string, errors?: string[] }
 */

// ===============================
// CORE TYPE DEFINITIONS
// ===============================

/**
 * Base type for middleware context - can hold any data
 */
export type MiddlewareContext = Record<string, any>;

/**
 * Generic result type for middleware return values
 */
export type MiddlewareResult<T = any> = T;

// ===============================
// RESPONSE TYPES
// ===============================

/**
 * Successful server function response
 * Contains the data returned by the handler
 */
export type ServerFnSuccessResponse<T> = {
  ok: true;
  data: T;
};

/**
 * Error server function response
 * Contains error code and array of error messages
 */
export type ServerFnErrorResponse = {
  ok: false;
  code: string;
  errors: string[];
};

/**
 * Union type for all possible server function responses
 * Always returns either success with data or error with code/messages
 */
export type ServerFnResponse<T> =
  | ServerFnSuccessResponse<T>
  | ServerFnErrorResponse;

/**
 * Helper type for better DX when using custom validation functions
 * Shows the expected return type from validation but still accepts any input
 * This allows FormData and other flexible inputs while showing what the handler will receive
 */
export type ExpectedInput<T> = T & {
  readonly __inputHint?: "This function expects input to be validated to this type";
};

// ===============================
// MIDDLEWARE TYPES
// ===============================

/**
 * Middleware function type - transforms context from one type to another
 * @param context - The context from the previous middleware (or empty object for first)
 * @returns Promise resolving to new context for next middleware
 */
export type MiddlewareFn<TContext = any, TResult = any> = (
  context: TContext
) => Promise<TResult>;

// ===============================
// ERROR CLASSES
// ===============================

/**
 * Base error class for gracefully handled errors that return structured responses instead of throwing
 *
 * @example
 * ```ts
 * // Single error
 * throw new ServerFnError("Something went wrong", "BUSINESS_ERROR");
 * // Returns: { ok: false, code: "BUSINESS_ERROR", errors: ["Something went wrong"] }
 *
 * // Multiple errors
 * throw new ServerFnError("Validation failed", "VALIDATION_ERROR", [
 *   "Name is required",
 *   "Email is invalid"
 * ]);
 * // Returns: { ok: false, code: "VALIDATION_ERROR", errors: ["Name is required", "Email is invalid"] }
 * ```
 */
export class ServerFnError extends Error {
  public code: string = "SERVER_ERROR";
  public errors: string[] = [];

  /**
   * Creates a new ServerFnError
   * @param message - Main error message
   * @param code - Error code (defaults to "SERVER_ERROR")
   * @param errors - Array of specific error messages (defaults to [message])
   */
  constructor(message: string, code?: string, errors?: string[]) {
    super(message);
    this.name = "ServerFnError";

    if (code) {
      this.code = code;
    }

    if (errors && errors.length > 0) {
      this.errors = errors;
    } else {
      // If no errors array provided, use the message
      this.errors = [message];
    }
  }
}

/**
 * Pre-defined error class for validation failures
 * @example throw new ValidationError("Form validation failed", ["Name required", "Email invalid"])
 */
export class ValidationError extends ServerFnError {
  constructor(message: string = "Validation failed", errors?: string[]) {
    super(message, "VALIDATION_ERROR", errors);
    this.name = "ValidationError";
  }
}

/**
 * Pre-defined error class for authentication failures
 * @example throw new UnauthorizedError("You must be logged in")
 */
export class UnauthorizedError extends ServerFnError {
  constructor(message: string = "Unauthorized") {
    super(message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

/**
 * Pre-defined error class for authorization failures
 * @example throw new ForbiddenError("You don't have permission to access this resource")
 */
export class ForbiddenError extends ServerFnError {
  constructor(message: string = "Forbidden") {
    super(message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

/**
 * Pre-defined error class for resource not found
 * @example throw new NotFoundError("User not found")
 */
export class NotFoundError extends ServerFnError {
  constructor(message: string = "Not found") {
    super(message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

// ===============================
// SERVER FUNCTION BUILDER INTERFACE
// ===============================

/**
 * Fluent interface for building server functions with middleware, validation, and handlers
 *
 * Type parameters:
 * - TContext: The context type (accumulated from middleware chain)
 * - TInput: The input type (set by validation)
 * - TValidated: Whether validation has been applied
 * - TIsZodSchema: Whether validation uses a Zod schema (affects typing behavior)
 */
export interface ServerFnBuilder<
  TContext = any,
  TInput = unknown,
  TValidated = false,
  TIsZodSchema = false
> {
  /**
   * Add middleware to the chain. Middleware execute sequentially, each receiving
   * the result of the previous middleware as context.
   *
   * @param middleware - Async function that transforms context
   * @returns New builder with updated context type
   *
   * @example
   * Basic chaining:
   * ```ts
   * createServerFn()
   *   .use(async () => ({ user: { id: 1 } }))
   *   .use(async (ctx) => ({ ...ctx, timestamp: Date.now() }))
   * ```
   *
   * @example
   * Creating reusable instances:
   * ```ts
   * // Create a base authenticated server function
   * const authServerFn = createServerFn().use(async () => {
   *   const session = await getSession();
   *   if (!session) throw new UnauthorizedError("Login required");
   *   return { user: session.user };
   * });
   *
   * // Extend it for specific endpoints
   * export const getProtectedData = authServerFn
   *   .use(async (ctx) => ({ ...ctx, timestamp: Date.now() }))
   *   .validate(z.object({ id: z.string() }))
   *   .handler(async ({ input, context }) => {
   *     // context.user is available from authServerFn
   *     // context.timestamp is available from additional middleware
   *     return { data: "protected", userId: context.user.id };
   *   });
   * ```
   */
  use<TResult>(
    middleware: MiddlewareFn<TContext, TResult>
  ): ServerFnBuilder<TResult, TInput, TValidated, TIsZodSchema>;

  /**
   * Add validation using a Zod schema. This provides full type safety for both
   * the function call and the handler.
   *
   * @param schema - Zod schema for validation
   * @returns New builder with typed input
   *
   * @example
   * ```ts
   * createServerFn()
   *   .validate(z.object({ name: z.string() }))
   *   .handler(({ input }) => input.name) // input is typed!
   *
   * // Function call is also typed:
   * await serverFn({ input: { name: "John" } }) // TypeScript enforces this structure
   * ```
   */
  validate<TSchema extends z.ZodType>(
    schema: TSchema
  ): TValidated extends true
    ? never
    : ServerFnBuilder<TContext, z.infer<TSchema>, true, true>;

  /**
   * Add validation using a custom function. This only types the handler - the function
   * call remains untyped to allow flexible inputs like FormData.
   *
   * @param validator - Custom validation function
   * @returns New builder with handler typed by validation result
   *
   * @example
   * ```ts
   * createServerFn()
   *   .validate(async (data) => {
   *     if (!(data instanceof FormData)) {
   *       throw new ValidationError('Expected FormData');
   *     }
   *     const name = data.get('name') as string;
   *     if (!name) {
   *       throw new ValidationError('Name is required');
   *     }
   *     return { name };
   *   })
   *   .handler(({ input }) => input.name) // input is typed as { name: string }
   *
   * // Function call accepts anything:
   * await serverFn({ input: formData }) // Works with FormData
   * await serverFn({ input: anything }) // Works with any input
   * ```
   */
  validate<TValidationResult>(
    validator: (data: unknown) => Promise<TValidationResult>
  ): TValidated extends true
    ? never
    : ServerFnBuilder<TContext, TValidationResult, true, false>;

  /**
   * Define the final handler function. This receives the validated input (if any)
   * and the accumulated context from all middleware.
   *
   * @param fn - Handler function
   * @returns Executable server function
   *
   * @example
   * ```ts
   * createServerFn()
   *   .use(async () => ({ userId: 123 }))
   *   .validate(z.object({ message: z.string() }))
   *   .handler(async ({ input, context }) => {
   *     // input: { message: string }
   *     // context: { userId: number }
   *     return { success: true };
   *   })
   * ```
   */
  handler<TOutput = any>(
    fn: TValidated extends true
      ? (args: { input: TInput; context: TContext }) => Promise<TOutput>
      : (args: { context: TContext }) => Promise<TOutput>
  ): TValidated extends true
    ? TIsZodSchema extends true
      ? (args: { input: TInput }) => Promise<ServerFnResponse<TOutput>>
      : (args: {
          input: ExpectedInput<TInput>;
        }) => Promise<ServerFnResponse<TOutput>>
    : () => Promise<ServerFnResponse<TOutput>>;
}

// ===============================
// SERVER FUNCTION IMPLEMENTATION
// ===============================

/**
 * Internal implementation of the ServerFnBuilder interface
 * Handles the actual execution logic for middleware, validation, and handlers
 */
class ServerFnBuilderImpl<
  TContext = any,
  TInput = unknown,
  TValidated extends boolean = false,
  TIsZodSchema extends boolean = false
> implements ServerFnBuilder<TContext, TInput, TValidated, TIsZodSchema>
{
  /** Array of middleware functions to execute in sequence */
  private middlewares: MiddlewareFn<any, any>[] = [];

  /** Validation function or Zod schema */
  private validator?: z.ZodType | ((data: unknown) => any);

  constructor(middlewares: MiddlewareFn<any, any>[] = []) {
    this.middlewares = middlewares;
  }

  /** Implementation of use() - adds middleware to the chain */
  use<TResult>(
    middleware: MiddlewareFn<TContext, TResult>
  ): ServerFnBuilder<TResult, TInput, TValidated, TIsZodSchema> {
    // Create new builder with middleware added to the chain
    return new ServerFnBuilderImpl<TResult, TInput, TValidated, TIsZodSchema>([
      ...this.middlewares,
      middleware,
    ]);
  }

  /** Implementation of validate() - adds validation to the chain */
  validate<TValidationResult>(
    validator:
      | z.ZodType<TValidationResult>
      | ((data: unknown) => Promise<TValidationResult>)
  ): TValidated extends true
    ? never
    : ServerFnBuilder<TContext, TValidationResult, true, any> {
    if (this.validator) {
      throw new Error("validate() can only be called once");
    }

    // Create new builder with validation added
    const newBuilder = new ServerFnBuilderImpl<
      TContext,
      TValidationResult,
      true,
      any
    >(this.middlewares);
    newBuilder.validator = validator;
    return newBuilder as any;
  }

  /**
   * Implementation of handler() - creates the final executable server function
   * This is where all the magic happens: middleware execution, validation, and error handling
   */
  handler<TOutput = any>(
    fn: TValidated extends true
      ? (args: { input: TInput; context: TContext }) => Promise<TOutput>
      : (args: { context: TContext }) => Promise<TOutput>
  ): TValidated extends true
    ? (args: { input: TInput }) => Promise<ServerFnResponse<TOutput>>
    : () => Promise<ServerFnResponse<TOutput>> {
    return (async (args?: { input?: any }) => {
      try {
        const input = args?.input;

        // STEP 1: Execute middleware chain sequentially
        // Each middleware receives the result of the previous one as context
        let context: any = {};
        for (const middleware of this.middlewares) {
          context = await middleware(context);
        }

        // STEP 2: Validate input if validator is provided
        let validatedInput = input;
        if (this.validator && input !== undefined) {
          try {
            if (typeof this.validator === "function") {
              // Custom validation function - can handle FormData, objects, etc.
              validatedInput = await this.validator(input);
            } else {
              // Zod schema validation - strict type checking
              validatedInput = this.validator.parse(input);
            }
          } catch (error) {
            if (error instanceof z.ZodError) {
              // Return structured validation errors with VALIDATION_ERROR code
              return {
                ok: false,
                code: "VALIDATION_ERROR",
                errors: error.issues.map((issue: any) => issue.message),
              } as any;
            }
            // Return unexpected validation errors
            return {
              ok: false,
              code: "VALIDATION_ERROR",
              errors: [`Validation failed: ${String(error)}`],
            } as any;
          }
        }

        // STEP 3: Execute the handler function
        let result;
        if (this.validator && validatedInput !== undefined) {
          // If we have validation, pass both validated input and accumulated context
          result = await (fn as any)({ input: validatedInput, context });
        } else {
          // If no validation, just pass accumulated context
          result = await (fn as any)({ context });
        }

        // STEP 4: Return successful response with standardized format
        return {
          ok: true,
          data: result,
        } as any;
      } catch (error) {
        // STEP 5: Handle errors
        if (error instanceof ServerFnError) {
          // Gracefully handled errors: return structured error response (don't throw)
          return {
            ok: false,
            code: error.code,
            errors: error.errors,
          } as any;
        }

        // Hard errors: re-throw to crash (unexpected system errors)
        throw error;
      }
    }) as any;
  }
}

// ===============================
// MAIN EXPORT FUNCTION
// ===============================

/**
 * Creates a new server function builder with fluent API for Next.js
 *
 * @returns A new ServerFnBuilder instance to start building your server function
 *
 * @example
 * Basic usage:
 * ```ts
 * export const myServerFn = createServerFn()
 *   .handler(async () => ({ message: "Hello World!" }));
 * ```
 *
 * @example
 * With middleware and validation:
 * ```ts
 * export const authServerFn = createServerFn()
 *   .use(async () => ({ user: await getUser() }))
 *   .validate(z.object({ message: z.string() }))
 *   .handler(async ({ input, context }) => {
 *     return { user: context.user, echo: input.message };
 *   });
 *
 * // Usage:
 * const result = await authServerFn({ input: { message: "test" } });
 * if (result.ok) {
 *   console.log(result.data); // { user: {...}, echo: "test" }
 * } else {
 *   console.log(result.errors); // ["Validation failed"]
 * }
 * ```
 *
 * @example
 * With custom validation for FormData:
 * ```ts
 * export const formServerFn = createServerFn()
 *   .validate(async (data) => {
 *     if (!(data instanceof FormData)) {
 *       throw new ValidationError("Expected FormData");
 *     }
 *     const name = data.get('name') as string;
 *     if (!name) {
 *       throw new ValidationError("Name is required");
 *     }
 *     return { name };
 *   })
 *   .handler(async ({ input }) => ({ greeting: `Hello ${input.name}!` }));
 * ```
 */
export function createServerFn(): ServerFnBuilder<any, unknown, false, false> {
  return new ServerFnBuilderImpl();
}
