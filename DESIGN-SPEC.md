# AI Use Case Selection — Technical Design Specification

**Version:** 1.0  
**Date:** 2026-04-10  
**Status:** Current Production

---

## 1. Overview

The AI Use Case Selection tool is a full-stack web application that helps organisations capture, score, and prioritise AI use cases. Practitioners submit use cases against a client's technology profile; the system applies AI-powered scoring via the Anthropic Claude API and routes use cases through a Creator → Reviewer → Approver workflow.

### 1.1 Core Capabilities

| Capability | Description |
|---|---|
| Client Profiling | Capture a client's technology landscape (systems, integrations, data, cloud, constraints) as context for scoring |
| Use Case Submission | Structured form capturing title, description, objective, business unit, domain, workspace, and owner |
| AI Scoring | Claude Opus 4.6 analyses each use case against the client profile and returns 5-dimension scores + recommendation |
| Manual Score Override | Reviewers can adjust AI-generated scores before approval |
| Workflow | DRAFT → IN_REVIEW → APPROVED / REJECTED with role-based guards |
| Comments | Threaded comments on each use case from any role at any stage |
| Dashboard | Filterable table with summary cards showing total, quick wins, strategic, and avoid counts |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│   React 18 + Vite + Tailwind CSS                            │
│   React Router v6 · React Query v5 · Zustand v5             │
│   Axios                                                      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS  (VITE_API_URL)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      Backend API                             │
│                                                              │
│   Fastify v4 (Node.js 20, ESM)                              │
│   @fastify/cors · Prisma ORM v5                             │
│   @anthropic-ai/sdk                                         │
│                                                              │
│   Deployed: Railway (always-on, nixpacks)                   │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
┌──────────▼──────────┐    ┌──────────▼──────────────────────┐
│   PostgreSQL DB      │    │   Anthropic API                  │
│   (Railway managed) │    │   claude-opus-4-6                │
└─────────────────────┘    └─────────────────────────────────┘

Frontend Deployed: Vercel (static, CDN)
Backend Deployed:  Railway (container, auto-migrates on start)
```

### 2.1 Deployment Topology

| Component | Platform | Config |
|---|---|---|
| Frontend | Vercel | Static site, `frontend/` root, `vite build`, `serve -s dist` |
| Backend API | Railway | `nixpacks`, `npm install && npx prisma generate` → `npx prisma db push && node src/server.js` |
| Database | Railway (PostgreSQL) | Managed Postgres, `DATABASE_URL` injected via Railway reference variable |
| AI | Anthropic API | `ANTHROPIC_API_KEY` environment variable |

### 2.2 Alternative Deployment (AWS SAM)

An AWS SAM template exists at `infrastructure/template.yaml` for deploying to AWS:

| Resource | Type |
|---|---|
| `ApiFunction` | AWS Lambda (Node 20), `@fastify/aws-lambda` adapter, handles `/{proxy+}` |
| `FrontendBucket` | S3 static website bucket |
| `CloudFrontDistribution` | CDN over S3, HTTPS redirect, SPA 404→200 rewrite |

The Lambda entry point is `backend/src/lambda.js`, which wraps the same Fastify app via `@fastify/aws-lambda`.

---

## 3. Backend

### 3.1 Technology Stack

| Package | Version | Purpose |
|---|---|---|
| `fastify` | ^4.28 | HTTP framework |
| `@fastify/cors` | ^9.0 | CORS (`origin: true` — allows all origins) |
| `@prisma/client` | ^5.22 | Postgres ORM and query builder |
| `@anthropic-ai/sdk` | ^0.39 | Claude API client |
| `@fastify/aws-lambda` | — | Lambda adapter for SAM deployment |
| Node.js | 20, ESM (`"type": "module"`) | Runtime |

### 3.2 Application Bootstrap

**`src/server.js`** — entry point for Railway/local:
```
buildApp() → listen({ port: process.env.PORT || 3001, host: '0.0.0.0' })
```

**`src/lambda.js`** — Lambda entry point:
```
buildApp() → awsLambdaFastify(app) → export handler
```

**`src/app.js`** — registers plugins and routes:
```
Fastify({ logger: true })
  .register(cors, { origin: true })
  .register(clientProfileRoutes)
  .register(useCaseRoutes)
  .register(analyzeRoutes)
  .register(workflowRoutes)
  .get('/health', () => ({ status: 'ok' }))
```

### 3.3 API Routes

#### Client Profile — `src/routes/clientProfile.js`

| Method | Path | Description |
|---|---|---|
| `GET` | `/client-profile` | List all profiles, ordered by `createdAt` descending |
| `POST` | `/client-profile` | Create a new profile |
| `PUT` | `/client-profile/:id` | Update an existing profile |

#### Use Case — `src/routes/useCase.js`

| Method | Path | Description |
|---|---|---|
| `GET` | `/use-cases` | List use cases with optional filters (query params: `businessUnit`, `domain`, `workspace`, `status`, `recommendation`), ordered by `totalScore` descending |
| `GET` | `/use-cases/:id` | Get a single use case with comments and client profile |
| `POST` | `/use-case` | Create a use case |
| `PUT` | `/use-case/:id` | Update a use case |

#### Analysis — `src/routes/analyze.js`

| Method | Path | Description |
|---|---|---|
| `POST` | `/analyze` | Run AI analysis on a use case. Body: `{ useCaseId }` |

**Analysis flow:**
1. Fetch `UseCase` with `clientProfile` included
2. Call `analyzeUseCase(clientProfile, useCase)` — returns structured JSON from Claude
3. Call `applyScoring(scores)` — calculates `totalScore` and `recommendation`
4. Persist all AI scores, manual scores (set equal to AI on first run), `totalScore`, `recommendation`, `aiSummary`, `businessProblem`, `category`, `reasoning`
5. Return the updated use case with comments

#### Workflow — `src/routes/workflow.js`

| Method | Path | Guard | Action |
|---|---|---|---|
| `POST` | `/use-case/submit` | Status must be `DRAFT` | Set status → `IN_REVIEW` |
| `POST` | `/use-case/review` | Status must be `IN_REVIEW` | Update scores, recalculate total/recommendation, record `reviewedBy` + `reviewedAt` |
| `POST` | `/use-case/approve` | Status must be `IN_REVIEW` | Set status → `APPROVED`, record `approvedBy` + `approvedAt` |
| `POST` | `/use-case/reject` | Status must be `IN_REVIEW` | Set status → `REJECTED`, record `approvedBy` + `approvedAt` |
| `POST` | `/use-case/comment` | None | Create a `Comment` row |

---

### 3.4 AI Scoring Logic

#### `src/lib/claude.js` — Claude Integration

Model: `claude-opus-4-6`, `max_tokens: 1024`

The prompt is structured in two sections:

**Client context block** (injected from `ClientProfile`):
- Name, Core Systems, Integration Layer, Data Platforms, Channels, Cloud Environment, Data Quality, Constraints

**Use case block** (injected from `UseCase`):
- Title, Description, Business Objective, Business Unit, Domain

Claude is instructed to return **only valid JSON** (no markdown) in this exact structure:
```json
{
  "summary": "max 3 lines",
  "businessProblem": "...",
  "category": "Fraud | Claims | CX | Operations | Underwriting | Finance | HR | Other",
  "scores": {
    "value": 1-5,
    "feasibility": 1-5,
    "data": 1-5,
    "speed": 1-5,
    "risk": 1-5
  },
  "recommendation": "QUICK_WIN | STRATEGIC | AVOID",
  "reasoning": "2-3 sentences"
}
```

Score definitions given to the model:
- **value**: 1 = low business impact → 5 = transformational
- **feasibility**: 1 = very complex/blocked → 5 = straightforward with existing stack
- **data**: 1 = unavailable/poor quality → 5 = ready and high quality
- **speed**: 1 = 18+ months → 5 = under 3 months
- **risk**: 1 = low risk → 5 = high risk *(penalises the total score)*

#### `src/lib/scoring.js` — Scoring Formula

```
Total Score = (value × 2) + feasibility + data + speed − risk

Recommendation:
  Total ≥ 18  →  QUICK_WIN
  Total ≥ 12  →  STRATEGIC
  Total < 12  →  AVOID
```

Value is double-weighted because business impact is the primary prioritisation driver. Risk is subtracted to penalise high-risk use cases. Score range: −1 (worst: all 1s) to 29 (best: all 5s with risk=1).

---

### 3.5 Data Layer — Prisma ORM

**`src/lib/prisma.js`** — singleton pattern:
```js
const globalForPrisma = globalThis
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

This prevents multiple Prisma Client instances during development hot-reload.

---

## 4. Data Model

All entities managed by Prisma ORM against PostgreSQL. Schema defined in `backend/prisma/schema.prisma`.

### 4.1 `ClientProfile`

Represents a client's technology landscape. Used as scoring context for all linked use cases.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `name` | String | Client organisation name |
| `systems` | String[] | Core systems (e.g. SAP, Core Insurance) |
| `integrations` | String[] | Integration layer (e.g. MuleSoft, REST APIs) |
| `dataPlatforms` | String[] | Data infrastructure (e.g. Snowflake, Fabric) |
| `channels` | String[] | Engagement channels (e.g. Web, Mobile, WhatsApp) |
| `cloudEnv` | String | Cloud environment (AWS, Azure, GCP, Hybrid, On-Premise) |
| `dataQuality` | String | High / Medium / Low |
| `constraints` | String[] | Business/regulatory constraints (e.g. POPIA) |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |
| `useCases` | UseCase[] | Reverse relation |

### 4.2 `UseCase`

Central entity. Holds submitted use case data, both AI and manual scores, workflow state, and AI analysis text.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `title` | String | |
| `description` | String | |
| `businessObjective` | String | |
| `businessUnit` | String | Claims, Underwriting, Finance, Operations, HR, IT, CX |
| `domain` | String | Fraud, Claims, CX, Operations, Underwriting, Finance, HR, Other |
| `workspace` | String | Innovation, Core Systems, Digital, Analytics, Infrastructure |
| `owner` | String | Named owner |
| `category` | String? | AI-assigned category (same options as domain) |
| **Manual scores** | | Set equal to AI scores on first analysis; editable by Reviewer |
| `scoreValue` | Int? | 1–5 |
| `scoreFeasibility` | Int? | 1–5 |
| `scoreData` | Int? | 1–5 |
| `scoreSpeed` | Int? | 1–5 |
| `scoreRisk` | Int? | 1–5 |
| `totalScore` | Float? | Computed: `(value×2)+feasibility+data+speed−risk` |
| `recommendation` | String? | QUICK_WIN / STRATEGIC / AVOID |
| **AI scores** | | Raw output from Claude, preserved independently of manual edits |
| `aiScoreValue` | Int? | |
| `aiScoreFeasibility` | Int? | |
| `aiScoreData` | Int? | |
| `aiScoreSpeed` | Int? | |
| `aiScoreRisk` | Int? | |
| **AI analysis text** | | |
| `aiSummary` | String? | Max 3 lines |
| `businessProblem` | String? | Core business problem statement |
| `reasoning` | String? | Scoring justification |
| **Workflow** | | |
| `status` | String | DRAFT (default), IN_REVIEW, APPROVED, REJECTED |
| `createdBy` | String | Name of creator |
| `reviewedBy` | String? | Name of reviewer |
| `approvedBy` | String? | Name of approver or rejecter |
| `reviewedAt` | DateTime? | |
| `approvedAt` | DateTime? | |
| `clientProfileId` | String | FK → ClientProfile |
| `comments` | Comment[] | Reverse relation |

### 4.3 `Comment`

Threaded comment on a use case. Any role can comment at any stage except APPROVED.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `content` | String | Comment text |
| `author` | String | Display name |
| `role` | String | Creator / Reviewer / Approver |
| `useCaseId` | String | FK → UseCase |
| `createdAt` | DateTime | Auto |

---

## 5. Frontend

### 5.1 Technology Stack

| Package | Version | Purpose |
|---|---|---|
| `react` | ^18.3 | UI framework |
| `react-dom` | ^18.3 | DOM renderer |
| `react-router-dom` | ^6.26 | Client-side routing |
| `@tanstack/react-query` | ^5.56 | Server state: fetching, caching, invalidation |
| `zustand` | ^5.0 | Client state: current user, active client profile |
| `axios` | ^1.7 | HTTP client |
| `vite` | ^5.4 | Build tool and dev server |
| `tailwindcss` | ^3.4 | Utility CSS |

### 5.2 Application Entry

**`src/main.jsx`:**
- Wraps app in `QueryClientProvider` (staleTime: 30s, retry: 1) and `BrowserRouter`
- Mounts to `#root`

**`src/App.jsx`:**
- Renders `UserSelector` modal if no `currentUser` in store
- Wraps all routes in `Layout`
- Defines 4 routes: `/`, `/client-profile`, `/use-cases/new`, `/use-cases/:id`

### 5.3 Routing

| Path | Component | Description |
|---|---|---|
| `/` | `Dashboard` | Use case table with filters and summary cards |
| `/client-profile` | `ClientProfilePage` | Create and select client profiles |
| `/use-cases/new` | `NewUseCasePage` | Create a new use case |
| `/use-cases/:id` | `UseCaseDetailPage` | Full detail, AI analysis, scores, workflow, comments |

### 5.4 State Management

#### Server State — React Query (`src/api/queries.js`)

All data fetching and mutations go through React Query hooks. The API client (`src/api/client.js`) reads `VITE_API_URL` at build time, falling back to `/api` for local proxying.

| Hook | Method | Endpoint | Invalidates |
|---|---|---|---|
| `useClientProfiles` | GET | `/client-profile` | — |
| `useUseCases(filters)` | GET | `/use-cases` | — |
| `useUseCase(id)` | GET | `/use-cases/:id` | — |
| `useCreateClientProfile` | POST | `/client-profile` | `clientProfiles` |
| `useCreateUseCase` | POST | `/use-case` | `useCases` |
| `useAnalyzeUseCase` | POST | `/analyze` | `useCases`, `useCase[id]` |
| `useSubmitUseCase` | POST | `/use-case/submit` | `useCases` |
| `useReviewUseCase` | POST | `/use-case/review` | `useCases` |
| `useApproveUseCase` | POST | `/use-case/approve` | `useCases` |
| `useRejectUseCase` | POST | `/use-case/reject` | `useCases` |
| `useAddComment` | POST | `/use-case/comment` | `useCase[useCaseId]` |

#### Client State — Zustand (`src/store/appStore.js`)

Persisted to `localStorage` under key `ai-use-case-app`.

| Key | Type | Purpose |
|---|---|---|
| `currentUser` | `{ name: string, role: string } \| null` | Identity for workflow actions and comments |
| `activeClientId` | `string \| null` | Selected client profile ID for new use case creation |

### 5.5 Pages

#### Dashboard (`src/pages/Dashboard.jsx`)

- Fetches all use cases via `useUseCases(filters)`
- Computes summary card counts from client-side filter of the returned array
- Renders 4 filter dropdowns (Business Unit, Domain, Status, Recommendation) — filters passed as query params to the API
- Renders a `<table>` with one row per use case; each row shows: title (linked), BU, domain, workspace, owner, 5 score cells, total, recommendation badge, status badge
- Empty state links to `/use-cases/new`

#### Client Profile Page (`src/pages/ClientProfilePage.jsx`)

- Lists existing profiles; clicking one sets `activeClientId` in Zustand store
- Active profile highlighted with maroon border
- New profile form with `TagInput` sub-component for array fields (systems, integrations, dataPlatforms, channels, constraints)
- `TagInput` manages local state: text input → `Enter` or `Add` button appends tag; `×` removes; value stored as string array

#### New Use Case Page (`src/pages/NewUseCasePage.jsx`)

- Reads `activeClientId` from store; shows warning banner if not set
- Controlled form: title, description, businessObjective (textareas), businessUnit / domain / workspace (dropdowns), owner (text)
- On submit: `POST /use-case` with `createdBy: currentUser.name` and `clientProfileId: activeClientId`
- Navigates to `/use-cases/:id` on success

#### Use Case Detail Page (`src/pages/UseCaseDetailPage.jsx`)

The most complex page. Sections:

**Header:** Title, status badge, recommendation badge, category chip. Action buttons:
- **Run AI Analysis** — visible when `status === 'DRAFT'`, calls `useAnalyzeUseCase`
- **Submit for Review** — visible when `status === 'DRAFT'` AND `totalScore != null`

**Details card:** Description, business objective, BU/domain, workspace/owner

**AI Analysis section:** Visible when `aiSummary` is populated. Shows: summary, business problem, reasoning

**Scores card:** 5 score chips (value, feasibility, data, speed, risk) + total score. Each chip shows the current (manual) score with colour coding; shows AI score below if it differs from manual.

**Score editor:** Visible to Reviewer when `status === 'IN_REVIEW'`. Five 1–5 dropdowns pre-populated from current scores. Save Review calls `useReviewUseCase` with the edited scores.

**Approve / Reject bar:** Visible to Approver when `status === 'IN_REVIEW'`.

**Comments:** List of comments (author, role, timestamp, content). Comment input + Post button visible when `status !== 'APPROVED'`.

### 5.6 UI Components

| Component | Purpose |
|---|---|
| `Layout` | App shell: maroon header with nav links and user selector, max-width content area |
| `UserSelector` | Modal dialog on first visit. Collects name + role (Creator, Reviewer, Approver). Persisted in Zustand. Shown as a pill button once set |
| `ScoreCell` | Coloured score chip: green (4–5), amber (3), red (1–2), grey (null) |
| `StatusBadge` | Pill badge: grey (DRAFT), blue (IN_REVIEW), green (APPROVED), red (REJECTED) |
| `RecommendationBadge` | Pill badge: green (QUICK_WIN), blue (STRATEGIC), red (AVOID) |

### 5.7 Styling

- **Tailwind CSS** with custom maroon palette (`maroon-50` through `maroon-950`; primary brand: `maroon-900` = `#800000`)
- Global base: `bg-gray-50`, `text-gray-900`, `antialiased`
- No CSS-in-JS; all styling via Tailwind utility classes

---

## 6. Workflow State Machine

```
           ┌─────────────────────────────┐
           │           DRAFT              │
           │  - Creator can edit          │
           │  - AI Analysis available     │
           └───────────┬─────────────────┘
                       │ Submit for Review
                       │ (requires totalScore set)
           ┌───────────▼─────────────────┐
           │          IN_REVIEW           │
           │  - Reviewer adjusts scores   │
           │  - Approver can decide       │
           └──────────┬──────────┬────────┘
                      │          │
               Approve           Reject
            (Approver role)  (Approver role)
                      │          │
           ┌──────────▼──┐  ┌────▼────────┐
           │  APPROVED   │  │  REJECTED   │
           │  Read-only  │  │  Read-only  │
           └─────────────┘  └─────────────┘
```

### Transition Rules

| Transition | Endpoint | Guard (backend) | Actor (frontend) |
|---|---|---|---|
| DRAFT → IN_REVIEW | `POST /use-case/submit` | Status must be `DRAFT` | Any role (Creator typically) |
| IN_REVIEW → IN_REVIEW (scores) | `POST /use-case/review` | Status must be `IN_REVIEW` | Role = Reviewer |
| IN_REVIEW → APPROVED | `POST /use-case/approve` | Status must be `IN_REVIEW` | Role = Approver |
| IN_REVIEW → REJECTED | `POST /use-case/reject` | Status must be `IN_REVIEW` | Role = Approver |

> **Note:** Role enforcement is UI-only in the current implementation. The backend does not verify user identity or role — it only checks status guards. Role-based access control (RBAC) is a future enhancement.

---

## 7. Environment Variables

### Backend (Railway)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (injected by Railway) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `PORT` | Auto | Injected by Railway; defaults to `3001` |

### Frontend (Vercel)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Full URL of the Railway backend (e.g. `https://xyz.up.railway.app`). **Must be set before build** — baked into the bundle at build time. Falls back to `/api` for local dev (proxied by Vite). |

---

## 8. Local Development

```bash
# Install all dependencies
npm run install:all      # runs npm install in both backend/ and frontend/

# Start backend (watches for changes)
cd backend && npm run dev     # node --watch src/server.js  →  :3001

# Start frontend (HMR)
cd frontend && npm run dev    # vite  →  :5173

# Vite proxy: /api → http://localhost:3001 (configured in vite.config.js)
# So frontend calls /api/use-cases and Vite rewrites to :3001/use-cases

# Database
cd backend && npm run db:migrate   # prisma migrate dev
cd backend && npm run db:generate  # prisma generate (after schema changes)
```

---

## 9. Project Structure

```
ai-use-case-selection/
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          — Data model (ClientProfile, UseCase, Comment)
│   ├── src/
│   │   ├── app.js                 — Fastify app factory (plugins + routes)
│   │   ├── server.js              — HTTP server entry (Railway/local)
│   │   ├── lambda.js              — AWS Lambda entry (SAM deployment)
│   │   ├── lib/
│   │   │   ├── claude.js          — Anthropic API integration + prompt
│   │   │   ├── prisma.js          — Prisma singleton
│   │   │   └── scoring.js         — Score formula + recommendation thresholds
│   │   └── routes/
│   │       ├── analyze.js         — POST /analyze
│   │       ├── clientProfile.js   — GET/POST/PUT /client-profile
│   │       ├── useCase.js         — GET/POST/PUT /use-cases, /use-case
│   │       └── workflow.js        — POST /use-case/{submit,review,approve,reject,comment}
│   ├── package.json
│   └── railway.toml               — Railway build + start commands
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx               — App entry: QueryClient + BrowserRouter
│   │   ├── App.jsx                — Routes + UserSelector gate
│   │   ├── index.css              — Tailwind base
│   │   ├── api/
│   │   │   ├── client.js          — Axios instance (VITE_API_URL || '/api')
│   │   │   └── queries.js         — All React Query hooks
│   │   ├── components/
│   │   │   ├── Layout.jsx         — App shell + nav
│   │   │   ├── UserSelector.jsx   — Identity modal
│   │   │   ├── ScoreCell.jsx      — Colour-coded score chip
│   │   │   ├── StatusBadge.jsx    — Status pill
│   │   │   └── RecommendationBadge.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      — Table + filters + summary cards
│   │   │   ├── ClientProfilePage.jsx — Tag input form + profile list
│   │   │   ├── NewUseCasePage.jsx — Use case creation form
│   │   │   └── UseCaseDetailPage.jsx — Full detail + AI + workflow + comments
│   │   └── store/
│   │       └── appStore.js        — Zustand: currentUser + activeClientId
│   ├── vite.config.js             — /api proxy → :3001
│   ├── tailwind.config.js         — Custom maroon palette
│   ├── package.json
│   └── railway.toml               — Vercel/Railway build + serve config
│
├── infrastructure/
│   └── template.yaml              — AWS SAM (Lambda + S3 + CloudFront)
│
├── package.json                   — Monorepo scripts
├── DESIGN-SPEC.md                 — This document
└── POWER-APPS-DESIGN-SPEC.md      — Power Platform conversion spec
```

---

## 10. Key Design Decisions

| Decision | Rationale |
|---|---|
| **Fastify over Express** | Lower overhead, built-in schema validation, native async/await, better TypeScript support path |
| **Prisma over raw SQL** | Type-safe queries, migration management, schema-as-code, simpler array field handling |
| **React Query over Redux/SWR** | Purpose-built for server state; automatic cache invalidation, background refetch, loading/error states without boilerplate |
| **Zustand over Context API** | Minimal boilerplate for simple client state; `persist` middleware gives free localStorage sync |
| **`origin: true` CORS** | Permits any origin — appropriate for a POC tool. Production would restrict to known domains. |
| **Role enforcement frontend-only** | Simplifies the POC; full RBAC (JWT + role claims) is a noted future enhancement |
| **AI scores set as manual on first run** | Gives reviewers a sensible starting point without requiring them to re-enter scores from scratch |
| **Total score formula weights value ×2** | Business impact is the primary filter; the double weight ensures high-value use cases rank above merely feasible ones |
| **`prisma db push` on start** | Simpler than `migrate deploy` for POC; avoids migration history management on Railway. Trade-off: less safe for destructive schema changes |
| **ESM throughout backend** | Consistent with modern Node.js; avoids CommonJS/ESM interop issues with Prisma |

---

## 11. Known Limitations (POC)

| Limitation | Impact | Mitigation Path |
|---|---|---|
| No authentication | Any user can access all data | Add OAuth (Auth0/Azure AD) + JWT middleware |
| Role enforcement is UI-only | Backend endpoints can be called by any role | Add role claim to JWT, validate in route handlers |
| No multi-tenancy | All users share all data | Add `organisationId` to all entities + row-level filtering |
| `prisma db push` on start | Destructive schema changes drop data | Switch to `prisma migrate deploy` with managed migration history |
| Claude API key in env | Key exposed if env is compromised | Use a secrets manager (Railway Secrets, AWS Secrets Manager) |
| No pagination | Large datasets will degrade dashboard performance | Add cursor-based pagination to `GET /use-cases` |
| Tag fields stored as `String[]` in Postgres | Filtering/searching by individual tag requires array operators | Acceptable for current scale |
