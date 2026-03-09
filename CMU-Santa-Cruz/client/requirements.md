## Packages
zustand | Global state management for mock authentication
date-fns | Date formatting and manipulation for the calendars
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility to merge tailwind classes

## Notes
- The application uses a mock authentication flow on initial load. Users enter any username/password to generate/fetch their User object via POST `/api/users/login`.
- Global state for the authenticated user is managed via Zustand.
- Dates are handled as `YYYY-MM-DD` strings locally before sending to the backend to avoid timezone issues.
- We assume Shadcn UI components are available at `@/components/ui/*` as per the directory structure.
