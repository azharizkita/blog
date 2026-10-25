## Zod The Guardian

### Case Study

> _"Make me a JS function that validates an API response using Zod and fixes missing fields with default values."_

Before diving into the code, let’s understand what we’re trying to solve here. Sometimes, APIs don’t return exactly what we expect. Maybe a field is missing, or an extra field sneaks in. This is where **Zod** helps. It allows us to validate data and set default values for missing fields.

### The problem

Imagine you expect this API response:

```json
{ "a": "nice", "b": "good" }
```

But instead, you get this:

```json
{ "a": "nice", "c": "something else" }
```

Field `b` is missing, and we have an extra field `c` we didn’t ask for. The solution? **Zod**.

### Fixing the response

Let’s break this down. The goal is to ensure that:
- If `b` is missing, we add it with a default value.
- If extra fields like `c` show up, we ignore them.

Here’s the plan: we’ll define a schema that requires `a`, allows `b` with a default value, and strictly ignores anything else.

### Writing the Zod schema

```js
import { z } from 'zod';

// Define the schema
const ResponseSchema = z.object({
  a: z.string(),  // 'a' must exist
  b: z.string().default("default value")  // 'b' gets a default if missing
}).strict();  // Prevents any extra fields

// Example API response with missing 'b' and extra 'c'
const apiResponse = { a: "nice", c: "something else" };

// Validate and parse the response
const parsedResponse = ResponseSchema.parse(apiResponse);

console.log(parsedResponse); // Output: { a: "nice", b: "default value" }
```

> **Explanation:**

- The `.default()` method sets a default value for `b` if it’s missing.
- `.strict()` ensures that only the fields `a` and `b` are allowed. Any extras, like `c`, will throw an error.

### Iteration without strict validation

If you don’t mind extra fields, you can remove the `.strict()` part and let Zod just focus on the required fields.

```js
const LooseResponseSchema = z.object({
  a: z.string(),
  b: z.string().default("default value")
});

// This will ignore 'c' and fix the missing 'b'
const looseParsedResponse = LooseResponseSchema.parse(apiResponse);

console.log(looseParsedResponse); // Output: { a: "nice", b: "default value" }
```

Now, even if the API returns extra fields like `c`, Zod will fix the missing `b` and just move on.

### Conclusion

With **Zod**, you can easily guard your API responses by:
1. **Ensuring required fields** are present.
2. **Setting default values** for missing fields.
3. **Handling extra fields** by either ignoring or rejecting them.

That’s it! You’ve got a reliable way to clean up your API responses and keep things consistent.