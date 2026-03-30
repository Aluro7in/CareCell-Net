# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Recent Features Added
- **ElevenLabs Voice AI (Complete)**: `POST /api/ai/tts` backend route — dynamically resolves available voice from ElevenLabs API (free-tier compatible, caches choice), uses `eleven_multilingual_v2` model. Frontend: auto-plays response audio when voice enabled, per-message speaker button on AI bubbles, animated speaking wave indicator, voice toggle (enabled by default), mic auto-sends transcript. Hindi & English both supported.
- **JWT Authentication (Complete)**: Full auth system with `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`. Uses `bcryptjs` (pure JS) for password hashing and `jsonwebtoken` for JWT tokens (7-day expiry). JWT_SECRET falls back to SESSION_SECRET env var.
- **Auth Frontend**: `AuthContext` + `AuthProvider` (`src/context/auth-context.tsx`) with `useAuth()` hook. `LoginPage` (`/login`) and `SignupPage` (`/signup`) — email or phone signup, role selector (Patient/Donor), collapsible T&C accordion with checkbox. Token persisted to `localStorage` as `carecell_token`.
- **Protected Routing**: All app routes wrapped in `ProtectedRoute` (redirects to `/login?next=...`). Auth pages use `AuthRoute` (redirects authenticated users to `/`). Login/signup pages hide header and bottom nav.
- **Logout**: Logout button (LogOut icon) visible in header when authenticated; clears token and redirects to login.
- **User Profile System**: Full digital health profile (`GET/PUT /api/profile`) with `profile` DB table — name, role, age, gender, phone, location, blood group, cancer type, stage, allergies, treatment, health notes, reports array, reliability score, avatar URL.
- **File Upload**: `POST /api/upload` (multer) accepts images + PDFs up to 10 MB; files served at `GET /api/uploads/:filename`; URLs saved to profile `reports` field.
- **Light/Dark Theme**: `ThemeProvider` + `useTheme` context in `src/context/theme-context.tsx`; persisted to `localStorage`; applies `.dark`/`.light` class to `<html>`; toggle in navbar header.
- **Profile Page** (`/profile`): Score ring (SVG conic), reliability bar + badge (Highly Reliable / Active / Needs Improvement), edit/save form, report upload/download/delete.
- **Premium UI**: Glassmorphism cards (`.glass`), gradient buttons (`.gradient-btn`), card shadows (`.card-shadow`), 6-tab bottom nav with indigo/emerald gradient indicator, animated theme toggle.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── carecell/           # CareCell Network React frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Project: CareCell Network

An AI-powered emergency healthcare platform connecting cancer patients with blood/platelet donors and nearby hospitals.

### Features
- Patient emergency request system with AI donor matching
- Blood compatibility engine using Haversine distance + scoring
- Emergency alert system (automatically notifies matched donors)
- Priority matching for critical urgency patients
- Hospital finder with nearby search
- AI Assistant chatbot for emergency guidance
- Dashboard with live polling every 5 seconds

### Database Schema
- `donors` — blood/platelet donor registry (name, blood_group, lat/lng, availability, phone)
- `patients` — cancer patient records with blood group, cancer type, urgency
- `requests` — emergency requests linking patients to active requests
- `alerts` — log of donor alerts sent per request
- `hospitals` — hospital registry with blood bank availability

### Sample Data
- 5 donors seeded (Mumbai, India)
- 3 hospitals seeded (Tata Memorial, Lilavati, Kokilaben)

### API Routes (`/api`)
- `GET/POST /donors` — list/register donors
- `PATCH /donors/:id/availability` — toggle donor availability
- `GET/POST /patients` — list/register patients
- `GET /hospitals` — list hospitals
- `GET /hospitals/nearby?lat=&lng=&radiusKm=` — nearby hospitals
- `GET/POST /requests` — list/create emergency requests (auto-matches and alerts)
- `PATCH /requests/:id/status` — update request status
- `POST /match` — match donors without creating a request
- `GET /alerts` — list recent alerts
- `POST /ai/chat` — AI assistant responses

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`).
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/carecell` (`@workspace/carecell`)

React + Vite frontend for CareCell Network. Full-featured app with 5 pages.
- Preview path: `/` (root)
- Port: 22535

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server — all CareCell backend logic.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec + Orval config. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.
