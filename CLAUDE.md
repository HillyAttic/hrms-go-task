# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EdVentureHub is a Next.js 16 admin dashboard for managing compliance tasks, clients, employees, attendance, and team workflows. Built with TypeScript, Tailwind CSS, and Firebase (Firestore + Auth).

**Tech Stack:**
- Next.js 16 (App Router, React 19, TypeScript)
- Firebase v11 (Firestore, Auth, Admin SDK, Cloud Messaging)
- UI: Radix UI, Tailwind CSS, Lucide/Heroicons
- Forms: react-hook-form + Zod validation
- Charts: ApexCharts
- Notifications: react-toastify

## Development Commands

```bash
# Development
npm run dev                    # Start dev server (http://localhost:3000)
npm run build                  # Production build
npm start                      # Start production server

# Testing
npm test                       # Run Jest tests
npm run test:watch             # Run tests in watch mode
npm run test:firebase          # Test Firebase connection

# Linting & Analysis
npm run lint                   # Run ESLint
npm run analyze                # Analyze bundle size
npm run perf:bundle            # Analyze bundle with source-map-explorer

# Scripts
npm run migrate:client-numbers # Add client numbers to existing clients
npm run optimize:images        # Optimize images
```

## Architecture

### Authentication Flow

**Client → API → Service Layer Pattern:**

1. **Client-side (`'use client'` pages):**
   - Import `authenticatedFetch` from `@/lib/api-client.ts`
   - Automatically adds Firebase ID token to `Authorization: Bearer <token>` header
   - Uses cached token (no network call unless expired)

2. **API Routes (`src/app/api/**/route.ts`):**
   - Import `verifyAuthToken`, `withAuth`, `withAdminAuth`, `withManagerAuth` from `@/lib/server-auth.ts`
   - Verify token with Firebase Admin SDK
   - User profile cached in-memory for 5 minutes (avoids Firestore read on every request)
   - Returns `{ success, user: { uid, email, claims: { role, permissions, isAdmin } } }`

3. **Service Layer:**
   - Import `adminDb`, `adminAuth` from `@/lib/firebase-admin.ts`
   - All Firestore operations use Admin SDK (server-side only)

**Example API Route:**
```typescript
import { withAdminAuth } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';

export const POST = withAdminAuth(async (request) => {
  const { uid, claims } = request.user!;
  const data = await adminDb.collection('items').add({ ... });
  return NextResponse.json({ success: true });
});
```

### Role-Based Access Control

**Roles:** `admin`, `manager`, `employee`

**Sidebar Navigation (`src/components/Layouts/sidebar/data/index.ts`):**
- Items with `requiresRole: ['admin']` only visible to admins
- Items with `requiresRole: ['admin', 'manager']` visible to managers and admins
- Items without `requiresRole` visible to all authenticated users

**API Route Protection:**
- `withAuth()` - Any authenticated user
- `withAdminAuth()` - Admin only
- `withManagerAuth()` - Manager or admin
- `withRoleAuth(['admin', 'manager'])` - Custom role check

### Next.js 16 Dynamic Routes

**IMPORTANT:** Route params are now `Promise<{id}>` in Next.js 16.

```typescript
// ❌ OLD (Next.js 14)
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
}

// ✅ NEW (Next.js 16)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

### Firebase Configuration

**Environment Variables (see `.env.example`):**
- `NEXT_PUBLIC_FIREBASE_*` - Client SDK (public, used in browser)
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Admin SDK (private, server-side only)
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` - FCM push notifications
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Location features
- `ENCRYPTION_KEY` - AES-256-CBC for password manager

**Firebase Admin Init (`src/lib/firebase-admin.ts`):**
- Tries `FIREBASE_SERVICE_ACCOUNT_KEY` (full JSON)
- Falls back to individual env vars (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)
- Last fallback: default credentials (GCP environments)

### Key Patterns

**Bulk Import Pattern:**
- Follow `src/components/password-manager/BulkImportModal.tsx` pattern
- File upload → `readFileAsText` → `parseCSV` → preview table → POST to API
- CSV utils: `src/utils/csv-parser.ts` (`parseCSV`, `validateCSVData`, `parseYN`)

**Error Handling:**
- API routes: `src/lib/api-error-handler.ts` (`ErrorResponses`, `handleApiError`)
- Client: `toast.error()` from `react-toastify`

**Firestore Batch Writes:**
- Limit to 499 operations per batch (Firestore max is 500)
- Use `adminDb.batch()` for bulk operations

**Service Imports:**
- Import `adminDb` lazily in services to avoid initialization issues:
  ```typescript
  const { adminDb } = await import('@/lib/firebase-admin');
  ```

## Key Files

- **Auth:** `src/lib/server-auth.ts`, `src/lib/api-client.ts`, `src/lib/firebase-admin.ts`
- **Error Handling:** `src/lib/api-error-handler.ts`
- **CSV Utils:** `src/utils/csv-parser.ts`
- **Sidebar Nav:** `src/components/Layouts/sidebar/data/index.ts`
- **Sidebar Icons:** `src/components/Layouts/sidebar/icons.tsx`

## Features

**Password Manager (March 2026):**
- Admin page: `/admin/password-manager` (GST, Income Tax, MCA tabs)
- User vault: `/access-vault` (read-only, reveal password on demand)
- Encryption: AES-256-CBC via Node.js `crypto`, key in `ENCRYPTION_KEY` env var
- Firestore: `credential_records` collection with `allowedUserIds[]` for access control
- API: `/api/password-manager/credentials/*`, `/api/password-manager/vault/*`
- Components: `src/components/password-manager/`

**Attendance System:**
- Clock in/out with geolocation tracking
- Break management (start/end)
- Leave requests with approval workflow
- Roster management (view/update schedules)
- Monthly attendance reports with export

**Task Management:**
- Recurring and non-recurring tasks
- Task delegation with manager hierarchy
- Kanban board view
- Task comments and completion tracking

**Client Management:**
- Client profiles with contact info
- Client visits tracking with geolocation
- Access vault for client credentials
- Monthly visit reports

## Performance Optimizations

**Bundle Splitting (`next.config.mjs`):**
- Framework chunk (React, React-DOM)
- Firebase chunk (all Firebase packages together)
- Charts chunk (ApexCharts)
- UI chunks (Radix UI, Heroicons)
- Form chunk (react-hook-form)
- Date chunk (date-fns, dayjs)

**Caching:**
- User profiles cached in-memory for 5 minutes (API routes)
- Firebase ID tokens cached (client-side, auto-refresh when expired)
- Static assets: 1 year cache with revalidation
- Service workers: no cache (always fresh)

**Image Optimization:**
- WebP and AVIF formats
- Multiple device sizes
- 60s minimum cache TTL
- Remote patterns for Firebase Storage, Google, GitHub

## Testing

**Jest Configuration:**
- Test files: `**/*.test.ts`, `**/*.test.tsx`
- Setup: `jest.setup.js`
- Environment: jsdom for React components
- Run single test: `npm test -- path/to/test.test.ts`

## Common Patterns

**Admin-only API Check:**
```typescript
if (authResult.user.claims.role !== 'admin') {
  return NextResponse.json({ error: 'Admin only' }, { status: 403 });
}
```

**Toast Notifications:**
```typescript
import { toast } from 'react-toastify';
toast.success('Operation successful');
toast.error('Operation failed');
```

**Radix UI Dialog:**
```typescript
import * as Dialog from '@radix-ui/react-dialog';
// See src/components/password-manager/CredentialModal.tsx for full example
```

**Form with Zod Validation:**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(1) });
const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });
```

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
