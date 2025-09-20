# Server Function Helper for Next.js

A type-safe, fluent API for creating Next.js server functions with middleware, validation, and graceful error handling.

## Features

- ✅ **Chainable API** - Fluent interface for building server functions
- ✅ **Type-safe middleware** - Context flows through middleware chain with full typing
- ✅ **Flexible validation** - Zod schemas or custom async validation functions
- ✅ **ExpectedInput helper** - Shows expected type for FormData while accepting any input
- ✅ **Graceful error handling** - Standardized `{ok, data?, code?, errors?}` responses
- ✅ **Extensible errors** - Create your own error classes with custom codes
- ✅ **Reusable instances** - Create base server functions and extend them
- ✅ **FormData support** - Handle file uploads and form submissions with proper typing
- ✅ **Hard vs soft errors** - ServerFnError returns structured responses, regular Errors crash
- ✅ **Zero dependencies** - Only requires Zod (which you probably already have)

## Quick Start

```ts
// Basic server function
export const hello = createServerFn().handler(async () => {
  return { message: "Hello, World!" };
});

// With validation
export const createUser = createServerFn()
  .validate(z.object({
    name: z.string().min(2),
    email: z.string().email(),
  }))
  .handler(async ({ input }) => {
    return { user: input, id: Math.random().toString() };
  });

// Usage in component
const result = await createUser({ 
  input: { name: "John", email: "john@example.com" } 
});

if (result.ok) {
  console.log(result.data.user); // Fully typed!
} else {
  console.log(result.errors); // ["Name is required", ...]
}
```

## API Reference

### `createServerFn()`

Creates a new server function builder.

### `.use(middleware)`

Adds middleware to the chain. Middleware execute sequentially, with each receiving the result of the previous as context.

```ts
const authServerFn = createServerFn()
  .use(async () => {
    const user = await getUser();
    if (!user) throw new UnauthorizedError("Login required");
    return { user };
  });

// Extend the base
export const getProfile = authServerFn.handler(async ({ context }) => {
  return { profile: context.user }; // context.user is typed!
});
```

### `.validate(schema | function)`

Adds validation to the server function. **Can only be called once per chain.**

**Zod Schema** - Types both function call and handler:
```ts
.validate(z.object({ name: z.string() }))
// Function call: serverFn({ input: { name: "John" } }) ✅ typed
// Handler: ({ input }) => input.name ✅ typed
```

**Custom Async Function** - Flexible input, typed handler:
```ts
.validate(async (data) => {
  if (!(data instanceof FormData)) {
    throw new ValidationError("Expected FormData");
  }
  const name = data.get('name') as string;
  if (!name) throw new ValidationError("Name required");
  
  // Can do async operations like DB lookups
  const user = await db.findUser(name);
  return { name, user };
})
// Function call: serverFn({ input: formData }) ✅ accepts anything
// TypeScript shows: ExpectedInput<{ name: string; user: User }>
// Handler: ({ input }) => input.user.id ✅ fully typed
```

### `.handler(function)`

Defines the main server function logic. Receives validated input and accumulated context.

## Error Handling

All errors return a standardized response format:

```ts
// Success
{ ok: true, data: T }

// Error  
{ ok: false, code: string, errors: string[] }
```

### Built-in Error Classes

All these return structured responses instead of crashing:

- `ValidationError(message, errors?)` - Form/input validation failures (code: "VALIDATION_ERROR")
- `UnauthorizedError(message?)` - Authentication required (code: "UNAUTHORIZED") 
- `ForbiddenError(message?)` - Permission denied (code: "FORBIDDEN")
- `NotFoundError(message?)` - Resource not found (code: "NOT_FOUND")
- `ServerFnError(message, code?, errors?)` - Base class for custom errors

```ts
// Single error
throw new ValidationError("Form invalid", ["Name required", "Email invalid"]);
// Returns: { ok: false, code: "VALIDATION_ERROR", errors: ["Name required", "Email invalid"] }

// Custom error class
class PaymentError extends ServerFnError {
  constructor(message = "Payment failed") {
    super(message, "PAYMENT_ERROR");
  }
}

// Usage
if (card.declined) {
  throw new PaymentError("Card was declined");
}
// Returns: { ok: false, code: "PAYMENT_ERROR", errors: ["Card was declined"] }
```

### Hard vs Soft Errors

```ts
// Soft errors (gracefully handled)
throw new ServerFnError("Business logic error"); 
// Returns: { ok: false, code: "SERVER_ERROR", errors: [...] }

// Hard errors (crash the function)
throw new Error("System failure");
// This will crash and need error boundary handling
```

## Examples

See the `examples/` directory for comprehensive examples:

- **01-basic-usage.ts** - Simple handlers and middleware
- **02-authentication-middleware.ts** - Reusable auth patterns
- **03-validation-examples.ts** - Zod vs custom validation
- **04-error-handling.ts** - Error types and custom errors
- **05-real-world-example.ts** - Complete blog system

## Demo

Run the development server to see interactive examples:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to try the live examples.

## Advanced Features

### Sequential Middleware Execution
Each middleware receives the result of the previous one:
```ts
createServerFn()
  .use(async () => ({ userId: "user-123" }))
  .use(async (context) => ({ ...context, timestamp: Date.now() })) // receives { userId: "user-123" }
  .use(async (context) => ({ ...context, requestId: "req-456" }))  // receives { userId: "user-123", timestamp: 1234567890 }
  .handler(async ({ context }) => {
    // context = { userId: "user-123", timestamp: 1234567890, requestId: "req-456" }
    return { processed: true };
  })
```

### ExpectedInput Type Helper
For custom validation, TypeScript shows the expected type but accepts any input:
```ts
// Custom validation returns { name: string }
// Function signature shows: ExpectedInput<{ name: string }>
// But you can pass FormData, objects, anything!
await serverFn({ input: formData }); // ✅ Works
await serverFn({ input: { anything: true } }); // ✅ Works
```

### Constraints
- `validate()` can only be called **once per chain**
- `handler()` is **required** - must be called last
- All validation, middleware and handler functions must be **async**

### Type Flow
```ts
// 1. Middleware chain types flow through
const authFn = createServerFn().use(authMiddleware); // TContext = { user: User }

// 2. Additional middleware extends context
const auditFn = authFn.use(auditMiddleware); // TContext = { user: User, audit: AuditInfo }

// 3. Validation sets input type
const validatedFn = auditFn.validate(schema); // TInput = z.infer<typeof schema>

// 4. Handler receives both
validatedFn.handler(({ input, context }) => {
  // input: fully typed from validation
  // context: fully typed from middleware chain
});
```

## Installation

```bash
npm install zod
```

Copy the `utils/create-server-fn.ts` file into your project.

## License

MIT