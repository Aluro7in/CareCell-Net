# CareCell Network

An AI-powered emergency healthcare platform connecting cancer patients with blood and platelet donors and nearby hospitals in real time. Built mobile-first for India with full Hindi and English support.

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [AI Donor Matching Algorithm](#ai-donor-matching-algorithm)
8. [AI Assistant](#ai-assistant)
9. [Frontend Pages](#frontend-pages)
10. [Environment Variables](#environment-variables)
11. [Local Development](#local-development)
12. [Design System](#design-system)

---

## Overview

CareCell Network is a full-stack web application that addresses the critical shortage of blood and platelet donors for cancer patients undergoing chemotherapy in India. Patients can submit emergency requests, and the platform's AI matching engine instantly identifies the top 5 compatible donors ranked by blood compatibility, proximity (Haversine distance), and real-time availability. A bilingual AI assistant (Hindi + English, with voice input and text-to-speech) guides users through emergencies.

The application is designed for a 430 px mobile-first viewport with a dark navy aesthetic and is fully responsive.

---

## Key Features

### Emergency Request & Donor Matching
- Patients submit an emergency request with blood group, diagnosis, urgency level, and GPS location.
- The backend instantly runs the AI matching engine and returns the top 5 compatible donors.
- Donors are scored on: exact blood group match, proximity, availability status, and critical-urgency bonus.
- Donors who donated within the last 90 days are automatically excluded.
- Donor contact numbers are shown directly so patients can call immediately.

### Real-Time Interactive Map
- Full-screen dark map (CartoDB dark tiles — no API key required) centered on Mumbai.
- Live markers for patients (red P), donors (blue D), and hospitals (green H).
- Purple "Me" marker with a 300 m radius circle for the user's GPS location.
- Haversine distance from user to every marker displayed on click.
- Sliding info panel shows blood group, urgency, phone, and distance details.
- Stats overlay at the top counts available donors, hospitals, and patients.
- Collapsible legend panel.
- Refresh button to re-acquire GPS.

### AI Assistant (Bilingual Voice)
- Powered by OpenRouter → `openai/gpt-4o-mini`.
- Structured JSON responses: `{ reply, suggestions }` — always returns 2–3 follow-up suggestions.
- Voice input via the Web Speech API (`webkitSpeechRecognition`).
  - Language auto-detected: Devanagari Unicode range (`\u0900–\u097F`) → `hi-IN`, otherwise `en-IN`.
- Text-to-speech reply via `window.speechSynthesis` (toggleable).
- Offline fallback responses for common topics (donor, emergency, platelet) when the AI API is unavailable.

### Dashboard
- Live feed of all emergency requests with status badges (active / pending / fulfilled / cancelled).
- One-click "Match Donors" button per request — calls the `/api/requests/:id/match` endpoint and shows matched donors inline.
- Request status can be updated (active → fulfilled, etc.).

### Patient Registration
- Form with: full name, blood group (dropdown), cancer/diagnosis type, urgency (normal / critical), phone number, and auto-detected GPS coordinates.
- Full client-side and server-side validation with field-level Zod error messages shown in red below each input.
- Submitting creates both a `patients` row and a `requests` row atomically, then fires the matching engine.

### Donor Registration
- Form with: full name, blood group, phone, availability toggle, and GPS coordinates.
- Donor availability can be toggled after registration via `PATCH /api/donors/:id/availability`.

### Real-Time Alerts
- Every emergency request automatically generates alert records for each matched donor.
- Alerts are stored in the `alerts` table and retrievable via `GET /api/alerts` (latest 50).

---

## Tech Stack

### Frontend (`artifacts/carecell`)
| Layer | Library / Version |
|---|---|
| Framework | React 18 + Vite |
| Routing | Wouter 3.3 |
| State / Data | TanStack Query (React Query) |
| Forms | React Hook Form + @hookform/resolvers |
| Validation | Zod |
| Map | React-Leaflet 5 + Leaflet 1.9 (CartoDB dark tiles) |
| Animation | Framer Motion |
| UI Components | shadcn/ui (Radix primitives) |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Voice | Web Speech API (built-in browser) |
| Build | Vite + @tailwindcss/vite |

### Backend (`artifacts/api-server`)
| Layer | Library / Version |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Database ORM | Drizzle ORM |
| Database | PostgreSQL |
| Validation | Zod (all routes) |
| AI Client | openai SDK 6.33 → OpenRouter proxy |
| Logging | Pino + pino-http |
| Build | esbuild (single-file bundle) |

### Shared Libraries (`lib/`)
| Package | Purpose |
|---|---|
| `@workspace/db` | Drizzle schema + typed DB client |
| `@workspace/api-zod` | Shared Zod schemas |
| `@workspace/api-spec` | OpenAPI 3.1 specification (`openapi.yaml`) |
| `@workspace/api-client-react` | Auto-generated React Query hooks from OpenAPI spec |

---

## Project Structure

```
workspace/
├── artifacts/
│   ├── api-server/               # Express 5 REST API
│   │   ├── src/
│   │   │   ├── app.ts            # Express app setup, CORS, pino-http
│   │   │   ├── index.ts          # Server entry point (reads PORT env)
│   │   │   ├── routes/
│   │   │   │   ├── index.ts      # Mounts all sub-routers at /api
│   │   │   │   ├── health.ts     # GET /healthz
│   │   │   │   ├── donors.ts     # CRUD for donors
│   │   │   │   ├── patients.ts   # CRUD for patients
│   │   │   │   ├── hospitals.ts  # List + nearby hospitals
│   │   │   │   ├── requests.ts   # Emergency requests + matching
│   │   │   │   ├── alerts.ts     # Alert feed
│   │   │   │   └── ai.ts         # OpenRouter AI chat
│   │   │   └── lib/
│   │   │       ├── matching.ts   # Donor matching algorithm
│   │   │       ├── distance.ts   # Haversine formula
│   │   │       └── logger.ts     # Pino logger singleton
│   │   └── build.mjs             # esbuild bundle script
│   │
│   └── carecell/                 # React + Vite frontend
│       └── src/
│           ├── App.tsx           # Router + QueryClient setup
│           ├── components/
│           │   └── layout.tsx    # Bottom nav, page shell
│           ├── pages/
│           │   ├── home.tsx      # Landing / quick-action home
│           │   ├── patient.tsx   # Emergency request form
│           │   ├── donor.tsx     # Donor registration form
│           │   ├── dashboard.tsx # Live request feed
│           │   ├── map.tsx       # Full-screen interactive map
│           │   ├── ai-chat.tsx   # Bilingual AI assistant with voice
│           │   └── not-found.tsx # 404 page
│           └── hooks/
│               ├── use-ai-assistant.ts
│               ├── use-donors.ts
│               ├── use-requests.ts
│               ├── use-mobile.tsx
│               └── use-toast.ts
│
└── lib/
    ├── db/                       # Drizzle ORM + PostgreSQL
    │   └── src/
    │       ├── index.ts          # Pool + drizzle client export
    │       └── schema/
    │           ├── donors.ts
    │           ├── patients.ts
    │           ├── requests.ts
    │           ├── hospitals.ts
    │           └── alerts.ts
    ├── api-spec/
    │   └── openapi.yaml          # Full OpenAPI 3.1 spec
    ├── api-zod/                  # Shared Zod schemas
    └── api-client-react/
        └── src/generated/
            ├── api.ts            # Auto-generated React Query hooks
            └── api.schemas.ts    # Auto-generated TypeScript types
```

---

## Database Schema

All tables use PostgreSQL via Drizzle ORM. The database URL is read from the `DATABASE_URL` environment variable.

### `donors`
| Column | Type | Description |
|---|---|---|
| `id` | serial PK | Auto-increment primary key |
| `name` | text NOT NULL | Full name |
| `blood_group` | text NOT NULL | One of: A+, A-, B+, B-, AB+, AB-, O+, O- |
| `latitude` | real NOT NULL | GPS latitude |
| `longitude` | real NOT NULL | GPS longitude |
| `last_donation_date` | text | ISO date of last donation (nullable) |
| `available` | boolean NOT NULL | Default `true` — toggleable |
| `phone` | text NOT NULL | Contact phone number |
| `created_at` | timestamp NOT NULL | Default `now()` |

### `patients`
| Column | Type | Description |
|---|---|---|
| `id` | serial PK | Auto-increment primary key |
| `name` | text NOT NULL | Full name |
| `blood_group` | text NOT NULL | One of the 8 blood groups |
| `cancer_type` | text NOT NULL | Diagnosis / cancer type |
| `latitude` | real NOT NULL | GPS latitude |
| `longitude` | real NOT NULL | GPS longitude |
| `urgency` | text NOT NULL | `normal` or `critical`, default `normal` |
| `created_at` | timestamp NOT NULL | Default `now()` |

### `requests`
| Column | Type | Description |
|---|---|---|
| `id` | serial PK | Auto-increment primary key |
| `patient_id` | integer NOT NULL | FK → patients.id |
| `patient_name` | text NOT NULL | Denormalized patient name |
| `blood_group` | text NOT NULL | Required blood group |
| `cancer_type` | text NOT NULL | Diagnosis |
| `urgency` | text NOT NULL | `normal` or `critical` |
| `status` | text NOT NULL | `pending`, `active`, `fulfilled`, `cancelled` |
| `latitude` | real NOT NULL | Patient GPS latitude |
| `longitude` | real NOT NULL | Patient GPS longitude |
| `phone` | text NOT NULL | Patient contact phone |
| `created_at` | timestamp NOT NULL | Default `now()` |

### `hospitals`
| Column | Type | Description |
|---|---|---|
| `id` | serial PK | Auto-increment primary key |
| `name` | text NOT NULL | Hospital name |
| `address` | text NOT NULL | Full address |
| `latitude` | real NOT NULL | GPS latitude |
| `longitude` | real NOT NULL | GPS longitude |
| `beds_available` | integer NOT NULL | Default `0` |
| `blood_bank_available` | boolean NOT NULL | Default `false` |
| `phone` | text NOT NULL | Contact phone |
| `created_at` | timestamp NOT NULL | Default `now()` |

### `alerts`
| Column | Type | Description |
|---|---|---|
| `id` | serial PK | Auto-increment primary key |
| `request_id` | integer NOT NULL | FK → requests.id |
| `donor_name` | text NOT NULL | Matched donor name |
| `donor_phone` | text NOT NULL | Matched donor phone |
| `blood_group` | text NOT NULL | Donor blood group |
| `patient_name` | text NOT NULL | Requesting patient name |
| `urgency` | text NOT NULL | `normal` or `critical` |
| `distance_km` | real NOT NULL | Calculated Haversine distance |
| `sent_at` | timestamp NOT NULL | Default `now()` |

---

## API Reference

Base URL: `/api`

All error responses return `{ error: string, details?: Record<string, string[]> }`.

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/healthz` | Returns `{ status: "ok" }` |

### Donors

| Method | Path | Description |
|---|---|---|
| GET | `/donors` | List all donors |
| POST | `/donors` | Register a new donor |
| PATCH | `/donors/:id/availability` | Toggle donor availability |

**POST `/donors` body:**
```json
{
  "name": "string (2–100 chars)",
  "bloodGroup": "A+ | A- | B+ | B- | AB+ | AB- | O+ | O-",
  "latitude": "number (-90 to 90)",
  "longitude": "number (-180 to 180)",
  "phone": "string (7–20 chars)",
  "lastDonationDate": "string (optional, ISO date)"
}
```

**PATCH `/donors/:id/availability` body:**
```json
{ "available": true }
```

### Patients

| Method | Path | Description |
|---|---|---|
| GET | `/patients` | List all patients |
| POST | `/patients` | Register a new patient |

**POST `/patients` body:**
```json
{
  "name": "string",
  "bloodGroup": "A+ | A- | ...",
  "cancerType": "string",
  "latitude": "number",
  "longitude": "number",
  "urgency": "normal | critical"
}
```

### Hospitals

| Method | Path | Description |
|---|---|---|
| GET | `/hospitals` | List all hospitals |
| GET | `/hospitals/nearby?lat=&lng=&radiusKm=` | Get hospitals within radius (default 20 km), sorted by distance |

### Emergency Requests

| Method | Path | Description |
|---|---|---|
| GET | `/requests` | List all emergency requests |
| POST | `/requests` | Create request + run matching engine |
| GET | `/requests/:id` | Get single request with matched donors |
| PATCH | `/requests/:id/status` | Update request status |
| POST | `/requests/:id/match` | Re-run donor matching for a request |

**POST `/requests` body:**
```json
{
  "name": "string (2–100 chars)",
  "bloodGroup": "A+ | A- | B+ | B- | AB+ | AB- | O+ | O-",
  "cancerType": "string (2–100 chars)",
  "latitude": "number",
  "longitude": "number",
  "urgency": "normal | critical",
  "phone": "string (7–20 chars)"
}
```

**POST `/requests` response (`201`):**
```json
{
  "id": 1,
  "patientName": "Riya Sharma",
  "bloodGroup": "B+",
  "urgency": "critical",
  "status": "active",
  "matchedDonors": [
    {
      "id": 3,
      "name": "Arjun Mehta",
      "bloodGroup": "B+",
      "phone": "9876543210",
      "distanceKm": 2.4,
      "score": 125,
      "available": true
    }
  ]
}
```

**PATCH `/requests/:id/status` body:**
```json
{ "status": "fulfilled" }
```

### Alerts

| Method | Path | Description |
|---|---|---|
| GET | `/alerts` | Get the latest 50 alert records |

### AI Assistant

| Method | Path | Description |
|---|---|---|
| POST | `/ai/chat` | Send a message, receive reply + suggestions |

**POST `/ai/chat` body:**
```json
{
  "message": "string (1–500 chars)",
  "context": "string (optional)"
}
```

**POST `/ai/chat` response:**
```json
{
  "reply": "Platelets are critical for chemotherapy patients...",
  "suggestions": [
    "Register as platelet donor",
    "Compatible blood types for platelets",
    "Create emergency request"
  ]
}
```

---

## AI Donor Matching Algorithm

File: `artifacts/api-server/src/lib/matching.ts`

### Blood Compatibility Matrix

| Patient Blood Group | Compatible Donor Groups |
|---|---|
| A+ | A+, A-, O+, O- |
| A- | A-, O- |
| B+ | B+, B-, O+, O- |
| B- | B-, O- |
| AB+ | A+, A-, B+, B-, AB+, AB-, O+, O- (universal recipient) |
| AB- | A-, B-, AB-, O- |
| O+ | O+, O- |
| O- | O- (universal donor) |

### Scoring System (max possible score: 125)

| Condition | Points |
|---|---|
| Exact blood group match | +50 |
| Distance < 5 km | +30 |
| Distance 5–15 km | +15 |
| Donor marked available | +20 |
| Urgency is `critical` AND distance < 10 km | +25 |

### Filters Applied Before Scoring
1. Only donors with a **compatible** blood group (per matrix above) are considered.
2. Donors who donated within the **last 90 days** are automatically excluded (platelet safety).
3. Results are **sorted descending by score** and **capped at the top 5**.

### Haversine Distance Formula

File: `artifacts/api-server/src/lib/distance.ts`

```
R = 6371 km (Earth radius)
dLat = (lat2 - lat1) * π / 180
dLon = (lon2 - lon1) * π / 180
a = sin²(dLat/2) + cos(lat1) * cos(lat2) * sin²(dLon/2)
distance = R * 2 * atan2(√a, √(1-a))
```

Result is rounded to 1 decimal place (e.g. `2.4 km`).

---

## AI Assistant

File: `artifacts/api-server/src/routes/ai.ts`

### Model & Provider
- **Provider:** OpenRouter (`https://openrouter.ai/api/v1`)
- **Model:** `openai/gpt-4o-mini`
- **API Key Detection:** If `OPENAI_API_KEY` starts with `sk-or-v1`, the backend automatically sets `baseURL` to OpenRouter and uses the OpenRouter model.

### System Prompt Capabilities
The AI is instructed to:
1. Help cancer patients find compatible blood/platelet donors
2. Explain blood type compatibility clearly
3. Guide users through medical emergencies step-by-step
4. Provide information about blood banks and hospitals
5. Educate about platelet donation (critical for chemotherapy patients)

All responses are returned as structured JSON: `{ reply: string, suggestions: string[] }`.

### Fallback Responses
When the AI API is unavailable, topic-based fallback responses are served:
- **donor / find / near** → donor finding instructions
- **emergency** → step-by-step emergency protocol
- **platelet** → platelet donation education
- **default** → general assistant introduction

### Voice Features (Frontend)

File: `artifacts/carecell/src/pages/ai-chat.tsx`

| Feature | Implementation |
|---|---|
| Voice Input | `webkitSpeechRecognition` (Chrome) |
| Language Detection | Devanagari Unicode (`\u0900–\u097F`) → `hi-IN`, else `en-IN` |
| Text-to-Speech | `window.speechSynthesis` — rate 0.95, pitch 1.0 |
| TTS Toggle | Microphone icon in chat header — on/off per session |
| TTS Language | Auto-detected from the AI reply text |

---

## Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/` | Home | Quick-action landing with CTA buttons |
| `/patient` | Patient Form | Emergency request submission with GPS + validation |
| `/donor` | Donor Form | Donor registration |
| `/map` | Live Map | Full-screen interactive Leaflet map |
| `/dashboard` | Dashboard | Live request feed with inline donor matching |
| `/ai` | AI Chat | Bilingual AI assistant with voice |

### Bottom Navigation

Five tabs: **Home** (House), **Request** (HeartPulse), **Map** (MapPin), **Donate** (Droplets), **AI** (Bot).

The sticky header is hidden on the `/map` page (`isMapPage` flag in `layout.tsx`) so Leaflet fills the full container height.

### Map Technical Notes
- Leaflet CSS imported directly: `import "leaflet/dist/leaflet.css"` (required for marker rendering)
- All custom markers use `L.divIcon` with inline SVG-style HTML — no broken default icon URLs
- Nav bar uses `z-index: 700`; stats overlay `z-index: 500`; selected panel `z-index: 600`; error toast `z-index: 1000`
- Default center: Mumbai `[19.076, 72.877]` used when geolocation is denied
- Map tile attribution: OpenStreetMap + CARTO
- Geolocation timeout: 10 s, maximum age: 60 s

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | Yes | Server port for each service |
| `OPENAI_API_KEY` | Yes | OpenRouter API key (prefix `sk-or-v1`) |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key for TTS |
| `SESSION_SECRET` | Yes | Secret for JWT token signing |

---

## Local Development

This project uses **pnpm workspaces**.

### Install dependencies
```bash
pnpm install
```

### Start the API server
```bash
pnpm --filter @workspace/api-server run dev
```

### Start the frontend
```bash
pnpm --filter @workspace/carecell run dev
```

### Push database schema
```bash
pnpm --filter @workspace/db run db:push
```

### Regenerate API client from OpenAPI spec
```bash
pnpm --filter @workspace/api-client-react run codegen
```

### Type-check frontend
```bash
pnpm --filter @workspace/carecell run typecheck
```

---

## Design System

| Property | Value |
|---|---|
| Viewport target | 430 px mobile-first |
| Color scheme | Dark navy (`background: #0a0f1e`) |
| Primary accent | Electric blue / violet gradient |
| Card background | `#111827` with `border-border/50` |
| Font (heading) | `font-display` (Inter / system) |
| Border radius | `rounded-2xl` / `rounded-3xl` for cards |
| Animation | Framer Motion spring transitions |
| Toast | shadcn/ui Toaster (top-center) |
| Map tiles | CartoDB Dark Matter (no API key needed) |

---

## Seed Data

The database is pre-seeded with Mumbai-area data:
- **4 blood donors** across Mumbai suburbs (Andheri, Bandra, Thane, Navi Mumbai)
- **3 hospitals** with blood bank status and bed counts
- All coordinates fall within the Mumbai metropolitan region (lat ≈ 19.0–19.2, lng ≈ 72.8–73.1)
