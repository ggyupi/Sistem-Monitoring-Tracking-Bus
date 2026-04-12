<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Buswy AI Agent Coding Convention

The goal of this document: ensure every AI agent change is consistent, safe, and follows patterns already used in this codebase.

### 1) Core Stack & Routing

- Use Pages Router (the `pages/` folder) for pages and API routes.
- Use API routes in `pages/api/**` for custom endpoints.
- For Better Auth routes, keep the handler in `pages/api/auth/[...all].ts`.

### 2) Next.js Rule (Required)

- Before implementing new features that affect Next.js behavior, read the relevant docs in `node_modules/next/dist/docs/`.
- Do not rely on assumptions from older Next.js versions.

### 3) API Response Convention (Required)

All custom APIs must use the centralized helper in `lib/api-response.ts`:

- Use `ApiResponses.success(...)` for successful responses.
- Use `ApiResponses.error(...)` for error responses.

Standard response format:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

```json
{
  "success": false,
  "data": null,
  "meta": {},
  "errors": [
    {
      "key": "VALIDATION_ERROR",
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

Error item rules:

- `key`: error category (example: `UNAUTHORIZED`, `METHOD_NOT_ALLOWED`, `VALIDATION_ERROR`)
- `field`: optional, used for field-level validation errors
- `message`: required, human-readable

### 4) Auth & Role Convention

- Better Auth source of truth is in `lib/auth.ts`.
- User role is stored as additional field `role` with default `USER`.
- Use the role enum from `types/user-role.ts`.
- Role-based middleware is defined in `middleware.ts`:
  - `/admin/**` and `/api/admin/**` are `ADMIN` only
  - `/user/**` and `/api/user/**` allow `USER` and `ADMIN`
- For protected APIs, do not rely on middleware only. Always validate session in the handler using `auth.api.getSession({ headers })`.

### 5) Database & Prisma Convention

- The schema source is `prisma/schema.prisma`.
- After changing the schema, run the appropriate Prisma migration flow.
- Do not hardcode role strings in multiple places when an enum already exists.

### 6) UI Component Convention

- Prioritize reusable components in `components/**`.
- For user/admin areas, use the layout + sidebar pattern:
  - `components/user/layout.tsx` + `components/user/sidebar.tsx`
  - `components/admin/layout.tsx` + `components/admin/sidebar.tsx`
- Use the class merge utility `cn` from `lib/utils.ts`.
- Use semantic style tokens (for example: `bg-background`, `text-muted-foreground`), avoid raw color hardcoding.

### 7) Form & Auth Page Convention

- Use `react-hook-form` + `zod` for input validation.
- Use `react-hot-toast` for client-side error/success feedback.
- For client auth flows, use `authClient` from `lib/auth-client.ts`.

### 7.1) Data Fetching & Mutation Convention (Required)

- For client-side data fetching and mutations, use TanStack React Query (`@tanstack/react-query`) as the default.
- Use `useQuery` for reads and `useMutation` for create/update/delete actions.
- Do not call `fetch` directly inside UI components for CRUD flows without React Query wrappers.
- Define stable query keys and invalidate relevant keys after successful mutations.
- Every data-loading and mutation flow must expose clear UI states: loading, submitting/pending, success feedback, and error feedback.
- Disable action buttons while mutation is pending to prevent duplicate submissions.

### 8) API Handler Checklist

When creating a new endpoint in `pages/api/**`, follow this order:

1. Validate method (`GET`, `POST`, etc.) and set the `Allow` header when needed.
2. Validate user session for protected endpoints.
3. Validate role for role-specific endpoints.
4. Return response using `ApiResponses.success/error`.
5. Include `meta` for pagination/filter/summary when applicable.

### 9) Coding Quality Rules

- Do not change large structures without a clear need.
- Avoid auth/response logic duplication; extract to helper functions when it starts repeating.
- Keep changes small, focused, and easy to review.
- After edits, ensure there are no TypeScript/lint errors in modified files.

### 10) Do / Do Not

Do:

- Follow existing patterns before creating new ones.
- Reuse existing helpers and components.
- Stay consistent with current naming and folder structure.

Do Not:

- Return custom API responses without `success/data/errors/meta`.
- Access user data from client-side assumptions in protected endpoints.
- Add styles/UI that significantly deviate from the current dashboard pattern without product reasons.
