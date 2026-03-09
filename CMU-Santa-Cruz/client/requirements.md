## Packages
@tanstack/react-query | Server state management for API calls and caching
wouter | Lightweight client-side routing
date-fns | Date formatting and manipulation for calendars
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility to merge tailwind classes

## Notes
- The app uses real session-based authentication with Passport and Express sessions (`/api/login`, `/api/register`, `/api/logout`, `/api/user`).
- API requests include cookies via `credentials: "include"`.
- Shared types and validation schemas live in `shared/schema.ts` and are reused by server and client.
- Dates are handled as `YYYY-MM-DD` strings locally before sending to the backend to avoid timezone issues.
- Shadcn UI components are available at `@/components/ui/*`.
