# ShiftSync — System Architecture & Technical Specification

**Project:** ShiftSync — Shift & Workforce Management Platform for the Mining Sector
**Competition:** CodeQuest 2026
**Author:** Peggy Avane (Index 21135388 · Student ID 6146924)
**Version:** 1.0 · July 2026
**Stack:** Expo (React Native) · Next.js · Spring Boot 3.x · Python FastAPI · PostgreSQL 16 · Apache Kafka · Redis

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Design Principles](#2-design-principles)
3. [Technology Stack & Justification](#3-technology-stack--justification)
4. [Microservices Decomposition](#4-microservices-decomposition)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Database Schema (PostgreSQL)](#6-database-schema-postgresql)
7. [Entity Relationship Overview](#7-entity-relationship-overview)
8. [Event Model (Kafka Topics)](#8-event-model-kafka-topics)
9. [API Design](#9-api-design)
10. [Core Data Flows](#10-core-data-flows)
11. [Offline-First Strategy](#11-offline-first-strategy)
12. [Fatigue Engine Specification](#12-fatigue-engine-specification)
13. [Security Architecture](#13-security-architecture)
14. [Project File Structures](#14-project-file-structures)
15. [Caching Strategy (Redis)](#15-caching-strategy-redis)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Engineering Standards](#17-engineering-standards)
18. [Deployment & Infrastructure](#18-deployment--infrastructure)
19. [Build Order (8 Sprints)](#19-build-order-8-sprints)
20. [Risks & Mitigations](#20-risks--mitigations)

---

## 1. Architecture Overview

ShiftSync is an **event-driven microservices system** with **offline-first clients**. Three tiers, with an asynchronous event backbone connecting the services.

```
┌──────────────────────────┐        ┌──────────────────────────┐
│   Expo (React Native)    │        │   Next.js Admin Portal   │
│   Worker + Supervisor    │        │   Supervisor / Safety /  │
│   iOS · Android          │        │   Admin (web)            │
│   ─ SQLite offline queue │        │   ─ WebSocket live views │
└────────────┬─────────────┘        └────────────┬─────────────┘
             │  HTTPS / REST (JSON) + JWT        │  REST + WSS
             └───────────────┬───────────────────┘
                             ▼
                 ┌───────────────────────┐
                 │  Spring Cloud Gateway │   Single entry point
                 │  JWT validation ·     │   Rate limiting ·
                 │  routing · CORS       │   Request tracing
                 └───────────┬───────────┘
                             │
   ┌──────────┬──────────┬───┴──────┬───────────┬──────────┬──────────┐
   ▼          ▼          ▼          ▼           ▼          ▼          ▼
┌──────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌─────────┐
│ Auth │ │ User   │ │ Shift  │ │Attendance│ │Notific.│ │Report. │ │Emergency│
│ Svc  │ │Profile │ │ Svc    │ │  Svc     │ │  Svc   │ │  Svc   │ │  Svc    │
└──┬───┘ └───┬────┘ └───┬────┘ └────┬─────┘ └───┬────┘ └───┬────┘ └────┬────┘
   │         │          │           │           │          │           │
   └─────────┴──────────┴─────┬─────┴───────────┴──────────┴───────────┘
                              │
                    ┌─────────▼──────────┐        ┌────────────────────┐
                    │   Apache Kafka     │◄──────►│  Fatigue Engine    │
                    │  (event backbone)  │        │  Python FastAPI    │
                    └─────────┬──────────┘        │  FAID/FAST models  │
                              │                   └────────────────────┘
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      ┌──────────────┐  ┌──────────┐  ┌──────────────┐
      │ PostgreSQL16 │  │  Redis   │  │  External:   │
      │ (per-service │  │ (cache + │  │  FCM · Twilio│
      │  schemas)    │  │  QR TTL) │  │  Google Maps │
      └──────────────┘  └──────────┘  └──────────────┘
```

**Two communication styles, used deliberately:**

| Style | Used for | Example |
|---|---|---|
| **Synchronous (REST via Gateway)** | Anything the user is waiting on | Login, load roster, scan QR, check in |
| **Asynchronous (Kafka events)** | Anything that fans out to other services | Check-in → fatigue recalculation → alert → push notification |

**Why this split matters:** a worker scanning a QR code underground must get a Yes/No in under 500ms. They must *not* wait for the fatigue engine to run a biomathematical model, for Kafka to fan out, and for FCM to deliver a push. The check-in is written and acknowledged immediately; everything downstream happens on the event bus.

---

## 2. Design Principles

1. **The mobile app is a thin, dumb client.** Every rule — can this worker take this shift, is this QR still valid, is this fatigue score critical — is enforced server-side. A phone in a worker's pocket is not a trusted device.
2. **Offline is the default, not the exception.** Underground has no signal. The app must let a worker complete a check-in with the network down and reconcile later. Design the sync path *first*, not as a patch.
3. **The shift is the spine.** Almost every table keys off `shifts` and `shift_assignments`. Attendance, fatigue, swaps, musters, and payroll reports all resolve back to "which shift, which worker, what state." Get this state machine right and everything else follows.
4. **Safety data is append-only.** Fatigue alerts, supervisor overrides, and muster responses are never hard-deleted. They are legal/compliance artefacts. Soft-delete or archive only.
5. **Each service owns its data.** No service reaches into another service's tables. Cross-service reads go through the API or the event stream. This is what makes independent deployment real rather than decorative.

---

## 3. Technology Stack & Justification

| Layer | Technology | Why this and not the alternative |
|---|---|---|
| Mobile | Expo (React Native) + TypeScript | One codebase, two platforms. Expo gives managed camera (QR), location, push, and SQLite without ejecting. |
| Local mobile DB | SQLite (expo-sqlite) | Durable offline queue. AsyncStorage is not transactional and will lose writes on a crash mid-shift. |
| Web portal | Next.js 14 (App Router) + TypeScript | SSR for fast dashboard loads; API routes for BFF-style aggregation; native WebSocket support for live headcount. |
| Backend | Spring Boot 3.x (Java 21) | Mature security (Spring Security + JWT), JPA/Hibernate, first-class Kafka and Cloud Gateway integration. |
| Fatigue engine | Python FastAPI | Fatigue models (FAID/FAST) are scientific/numeric work. Python has the ecosystem (NumPy/SciPy); Java does not, comfortably. |
| Primary DB | PostgreSQL 16 | Strong relational integrity for the shift/assignment/attendance graph. `PostGIS` extension for geofence containment. |
| Event bus | Apache Kafka | Durable, replayable log. If the notification service is down for 10 minutes, no fatigue alert is lost — it replays. |
| Cache | Redis | Active QR codes with native TTL (no cron job needed), live headcount counters, published roster cache. |
| Push | Expo Push + FCM | Single API for both platforms via Expo. |
| SMS | Twilio / Africa's Talking | Africa's Talking is materially cheaper for Ghanaian networks; Twilio is the fallback/international path. |
| Geofencing | Google Maps Geofencing API + PostGIS | API defines/validates zones client-side; PostGIS re-validates server-side. Never trust the client's "I'm inside." |
| API Gateway | Spring Cloud Gateway | Single ingress. JWT validated once, at the edge. |
| Containers/CI | Docker + GitHub Actions | Reproducible builds; every PR is built, tested, linted. |

---

## 4. Microservices Decomposition

| # | Service | Owns (tables) | Publishes | Consumes |
|---|---|---|---|---|
| 0 | **API Gateway** | — | — | — |
| 1 | **Auth Service** | `users` (credentials), `refresh_tokens` | `user.registered` | — |
| 2 | **User Profile Service** | `user_profiles`, `departments`, `certifications`, `user_certifications` | `user.updated`, `cert.expiring` | `user.registered` |
| 3 | **Shift Service** | `shifts`, `shift_assignments`, `shift_swap_requests`, `shift_templates` | `shift.published`, `shift.changed`, `shift.cancelled`, `swap.approved` | `fatigue.critical` (blocks assignment) |
| 4 | **Attendance Service** | `attendance_records`, `qr_codes` | `attendance.checked_in`, `attendance.checked_out`, `attendance.missing_checkout` | `shift.published` (pre-generate QR) |
| 5 | **Fatigue Engine** (FastAPI) | `fatigue_scores`, `fatigue_alerts`, `fatigue_self_reports` | `fatigue.scored`, `fatigue.alert` | `attendance.checked_in/out`, `shift.published` |
| 6 | **Notification Service** | `notifications` | `notification.acknowledged` | `shift.*`, `fatigue.alert`, `muster.*` |
| 7 | **Reporting Service** | `report_jobs` (read-replicas of others) | — | all (materialises read models) |
| 8 | **Emergency Service** | `emergency_musters`, `muster_responses` | `muster.initiated`, `muster.closed` | `attendance.checked_in` (to seed expected headcount) |

**Rule enforced across all services:** a service may only write to its own tables. When Reporting needs attendance data, it consumes attendance events and builds its own read model — it does not `SELECT` from the Attendance Service's schema.

---

## 5. User Roles & Permissions

| Capability | Worker | Supervisor | Safety Officer | Admin |
|---|---|---|---|---|
| Register / login | ✓ | ✓ | ✓ | — (seeded) |
| View own roster | ✓ | ✓ | ✓ | ✓ |
| View team roster | — | ✓ (own dept) | ✓ (all) | ✓ |
| Create / publish shifts | — | ✓ (own dept) | — | ✓ |
| Cancel / reassign shift | — | ✓ (own dept) | — | ✓ |
| Request shift swap | ✓ | ✓ | — | — |
| Approve shift swap | — | ✓ | — | ✓ |
| Check in / check out | ✓ | ✓ | ✓ | — |
| Generate QR code (muster point) | — | ✓ | ✓ | ✓ |
| View live headcount dashboard | — | ✓ (own dept) | ✓ (all zones) | ✓ |
| View own fatigue score | ✓ | ✓ | ✓ | ✓ |
| View team fatigue heatmap | — | ✓ (own dept) | ✓ (all) | ✓ |
| Override a **Critical** fatigue block | — | ✓ (reason mandatory) | ✓ | ✓ |
| Initiate emergency muster | — | ✓ | ✓ | ✓ |
| Close emergency muster | — | — | ✓ | ✓ |
| Generate compliance reports | — | ✓ (own dept) | ✓ | ✓ |
| Manage certifications | — | — | ✓ | ✓ |
| Manage users / departments | — | — | — | ✓ |

Roles are an enum on `users.role`, embedded as a claim in the JWT, and enforced at two layers:
- **Gateway:** coarse route-level filtering (a Worker's token cannot reach `/v1/admin/**`).
- **Service:** method-level `@PreAuthorize("hasRole('SUPERVISOR') and @deptGuard.owns(#deptId)")` for row-level scoping (a Supervisor may only touch *their own department*).

Never enforce authorization only at the gateway. A misrouted internal call would bypass it entirely.

---

## 6. Database Schema (PostgreSQL)

Logical schema. Each service owns its group of tables (separate schemas within one Postgres instance for the competition build; separate instances in production).

### 6.1 Identity & Org

```sql
CREATE TYPE user_role AS ENUM ('WORKER','SUPERVISOR','SAFETY','ADMIN');

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT UNIQUE NOT NULL,
  phone           VARCHAR(20) UNIQUE,           -- required: SMS fallback
  password_hash   TEXT NOT NULL,                -- BCrypt, cost 12
  display_name    VARCHAR(120) NOT NULL,
  role            user_role NOT NULL DEFAULT 'WORKER',
  department_id   UUID REFERENCES departments(id),
  employee_no     VARCHAR(40) UNIQUE NOT NULL,  -- mine's own payroll ID
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  mine_zone     VARCHAR(80)  NOT NULL,
  geofence      GEOGRAPHY(POLYGON, 4326),   -- PostGIS: the actual zone boundary
  supervisor_id UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE certifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(120) NOT NULL,   -- 'Underground Blasting', 'First Aid L2'
  description  TEXT,
  expiry_days  INT NOT NULL             -- validity period from issue
);

CREATE TABLE user_certifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cert_id    UUID NOT NULL REFERENCES certifications(id),
  issued_at  DATE NOT NULL,
  expires_at DATE NOT NULL,
  is_active  BOOLEAN GENERATED ALWAYS AS (expires_at >= CURRENT_DATE) STORED,
  UNIQUE (user_id, cert_id)
);
```

> **Design note:** `cert_ids[]` as an array column (as in the original proposal) breaks referential integrity and makes expiry queries painful. A join table is the correct normalisation.

### 6.2 Scheduling — the spine

```sql
CREATE TYPE shift_type   AS ENUM ('DAY','NIGHT','SWING');
CREATE TYPE shift_status AS ENUM ('DRAFT','PUBLISHED','CANCELLED','COMPLETED');
CREATE TYPE assign_status AS ENUM
  ('ASSIGNED','CONFIRMED','SWAP_PENDING','SWAPPED','PRESENT','ABSENT','COMPLETED');

CREATE TABLE shifts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id    UUID NOT NULL REFERENCES departments(id),
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ NOT NULL,
  shift_type       shift_type NOT NULL,
  required_workers INT NOT NULL CHECK (required_workers > 0),
  required_cert_id UUID REFERENCES certifications(id),  -- nullable
  status           shift_status NOT NULL DEFAULT 'DRAFT',
  created_by       UUID NOT NULL REFERENCES users(id),
  published_at     TIMESTAMPTZ,
  CHECK (end_time > start_time)
);
CREATE INDEX idx_shifts_dept_time ON shifts (department_id, start_time);

CREATE TABLE shift_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id      UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  status        assign_status NOT NULL DEFAULT 'ASSIGNED',
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at  TIMESTAMPTZ,
  UNIQUE (shift_id, user_id)          -- no double-booking on the same shift
);
-- prevents the *real* double-booking bug: same worker, two overlapping shifts
CREATE INDEX idx_assign_user ON shift_assignments (user_id);

CREATE TABLE shift_swap_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id   UUID NOT NULL REFERENCES users(id),
  target_user_id UUID NOT NULL REFERENCES users(id),
  shift_id       UUID NOT NULL REFERENCES shifts(id),
  status         VARCHAR(16) NOT NULL DEFAULT 'PENDING',  -- PENDING|APPROVED|REJECTED
  reason         TEXT,
  resolved_by    UUID REFERENCES users(id),
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Conflict detection query** (run before any assignment is written):

```sql
SELECT 1
FROM shift_assignments sa
JOIN shifts s ON s.id = sa.shift_id
WHERE sa.user_id = :userId
  AND s.status IN ('PUBLISHED','DRAFT')
  AND tstzrange(s.start_time, s.end_time)
      && tstzrange(:newStart, :newEnd);   -- && = ranges overlap
```

### 6.3 Attendance

```sql
CREATE TYPE attend_method AS ENUM ('QR','GPS','MANUAL');

CREATE TABLE attendance_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  shift_id        UUID NOT NULL REFERENCES shifts(id),
  method          attend_method NOT NULL,
  check_in_time   TIMESTAMPTZ,
  check_out_time  TIMESTAMPTZ,
  check_in_loc    GEOGRAPHY(POINT, 4326),
  check_out_loc   GEOGRAPHY(POINT, 4326),
  device_id       VARCHAR(120),          -- anti-spoofing: one device per worker
  captured_at     TIMESTAMPTZ NOT NULL,  -- when it happened on the device
  synced_at       TIMESTAMPTZ,           -- when the server received it
  is_offline_sync BOOLEAN NOT NULL DEFAULT FALSE,
  client_uuid     UUID NOT NULL,         -- idempotency key from the device
  UNIQUE (client_uuid)                   -- replayed sync cannot double-insert
);
CREATE UNIQUE INDEX uq_attend_user_shift ON attendance_records (user_id, shift_id);

CREATE TABLE qr_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id     UUID NOT NULL REFERENCES shifts(id),
  code_hash    TEXT NOT NULL,            -- HMAC-SHA256(shift_id|window|secret)
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,     -- generated_at + 90s
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);
```

> **`captured_at` vs `synced_at` is the single most important pair of columns in the whole schema.** A worker who checks in at 06:00 underground and surfaces at 14:00 must be recorded as present *at 06:00*, not 14:00. Fatigue scores, payroll, and overtime all depend on this distinction. `synced_offline BOOLEAN` alone (as in the original proposal) cannot express it.

### 6.4 Fatigue

```sql
CREATE TYPE risk_level AS ENUM ('LOW','ADVISORY','WARNING','CRITICAL');

CREATE TABLE fatigue_scores (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id),
  calculated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  hours_worked_24h   NUMERIC(4,1) NOT NULL,
  hours_worked_7d    NUMERIC(5,1) NOT NULL,
  night_shifts_7d    INT NOT NULL,
  consecutive_days   INT NOT NULL,
  self_report_score  INT,                         -- 1–5, nullable
  score              INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  risk_level         risk_level NOT NULL,
  model_version      VARCHAR(20) NOT NULL         -- audit: which model produced this
);
CREATE INDEX idx_fatigue_user_time ON fatigue_scores (user_id, calculated_at DESC);

CREATE TABLE fatigue_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  score_id         UUID NOT NULL REFERENCES fatigue_scores(id),
  alert_level      risk_level NOT NULL,
  triggered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_by  UUID REFERENCES users(id),
  acknowledged_at  TIMESTAMPTZ,
  override_reason  TEXT,                          -- MANDATORY when CRITICAL is overridden
  resolved_at      TIMESTAMPTZ,
  CHECK (acknowledged_by IS NULL OR acknowledged_at IS NOT NULL)
);

CREATE TABLE fatigue_self_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  shift_id    UUID REFERENCES shifts(id),
  sleep_hours NUMERIC(3,1),
  alertness   INT CHECK (alertness BETWEEN 1 AND 5),   -- Karolinska-style
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.5 Notifications & Emergency

```sql
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            VARCHAR(24) NOT NULL,  -- SHIFT_CHANGE|FATIGUE|MUSTER|BROADCAST
  channel         VARCHAR(8)  NOT NULL,  -- PUSH|SMS
  title           VARCHAR(160) NOT NULL,
  message         TEXT NOT NULL,
  payload         JSONB,                 -- deep-link target
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,           -- worker tapped 'Confirmed'
  escalated_at    TIMESTAMPTZ            -- supervisor alerted (no ack in window)
);
CREATE INDEX idx_notif_unacked ON notifications (user_id)
  WHERE acknowledged_at IS NULL;

CREATE TABLE emergency_musters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by      UUID NOT NULL REFERENCES users(id),
  zone              VARCHAR(80) NOT NULL,
  initiated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at         TIMESTAMPTZ,
  closed_by         UUID REFERENCES users(id),
  expected_workers  INT NOT NULL,        -- snapshot of live headcount at t=0
  accounted_workers INT NOT NULL DEFAULT 0
);

CREATE TABLE muster_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muster_id    UUID NOT NULL REFERENCES emergency_musters(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id),
  status       VARCHAR(16) NOT NULL DEFAULT 'UNACCOUNTED',  -- PRESENT|UNACCOUNTED
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES users(id),   -- self, or supervisor marking manually
  location     GEOGRAPHY(POINT, 4326),
  UNIQUE (muster_id, user_id)
);
```

> **Why `expected_workers` is a snapshot:** during an emergency, workers are checking out and fleeing. If the muster recomputed "expected" live, the denominator would shrink and the system would report 100% accounted while people were still trapped. Freeze the denominator at t=0.

### 6.6 Audit

```sql
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES users(id),
  action      VARCHAR(80) NOT NULL,   -- 'FATIGUE_OVERRIDE','SHIFT_CANCEL',...
  entity_type VARCHAR(40) NOT NULL,
  entity_id   UUID,
  before      JSONB,
  after       JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Append-only. No `UPDATE` or `DELETE` grants on this table for the application role.

---

## 7. Entity Relationship Overview

```
departments ──1:N──> users ──1:N──> user_certifications ──N:1──> certifications
     │                 │
     │ 1:N             │ 1:N
     ▼                 ├──────────> attendance_records ──N:1──> shifts
   shifts              ├──────────> fatigue_scores ──1:N──> fatigue_alerts
     │                 ├──────────> notifications
     │ 1:N             ├──────────> muster_responses ──N:1──> emergency_musters
     ▼                 └──────────> fatigue_self_reports
shift_assignments
     │
     └── shift_swap_requests (requester, target, shift)

shifts ──1:N──> qr_codes
```

**The spine:** `shifts → shift_assignments`. Attendance validates against it. Fatigue is computed from it. Musters count against it. Reports aggregate it.

---

## 8. Event Model (Kafka Topics)

| Topic | Producer | Key | Consumers | Payload (core fields) |
|---|---|---|---|---|
| `shift.published` | Shift Svc | `shift_id` | Notification, Attendance, Fatigue | shift_id, dept_id, assignee_ids[], start, end, type |
| `shift.changed` | Shift Svc | `shift_id` | Notification, Fatigue | shift_id, change_type, affected_user_ids[] |
| `shift.cancelled` | Shift Svc | `shift_id` | Notification, Attendance | shift_id, reason, affected_user_ids[] |
| `swap.approved` | Shift Svc | `shift_id` | Notification, Fatigue | swap_id, from_user, to_user, shift_id |
| `attendance.checked_in` | Attendance Svc | `user_id` | Fatigue, Emergency, Reporting | user_id, shift_id, captured_at, method, loc |
| `attendance.checked_out` | Attendance Svc | `user_id` | Fatigue, Reporting | user_id, shift_id, captured_at, hours_worked |
| `attendance.missing_checkout` | Attendance Svc | `user_id` | Notification, Emergency | user_id, shift_id, expected_out |
| `fatigue.scored` | Fatigue Engine | `user_id` | Reporting | user_id, score, risk_level, model_version |
| `fatigue.alert` | Fatigue Engine | `user_id` | Notification, Shift Svc | user_id, alert_level, score, shift_id |
| `muster.initiated` | Emergency Svc | `muster_id` | Notification | muster_id, zone, expected_workers |
| `muster.closed` | Emergency Svc | `muster_id` | Notification, Reporting | muster_id, accounted, unaccounted_ids[] |

**Conventions:**
- Partition key is always the entity the event is *about* → guarantees per-worker ordering (a check-out never processes before its check-in).
- Every event carries `event_id` (UUID), `occurred_at`, and `version`. Consumers are **idempotent**: they dedupe on `event_id`.
- Retention: 7 days for operational topics, **90 days for `fatigue.*` and `muster.*`** (compliance replay).

---

## 9. API Design

All routes are versioned and sit behind the gateway: `https://api.shiftsync.io/v1/...`

### 9.1 Auth Service
| Method | Route | Role | Purpose |
|---|---|---|---|
| POST | `/v1/auth/register` | public | Register (invite-code gated in production) |
| POST | `/v1/auth/login` | public | → `{ accessToken (15m), refreshToken (30d) }` |
| POST | `/v1/auth/refresh` | public | Rotate refresh token |
| POST | `/v1/auth/logout` | any | Revoke refresh token |
| POST | `/v1/auth/password/reset` | public | Email/SMS reset link |

### 9.2 Shift Service
| Method | Route | Role | Purpose |
|---|---|---|---|
| GET | `/v1/shifts?from&to&deptId` | any | Roster in a window |
| GET | `/v1/shifts/me?from&to` | worker | My shifts only |
| POST | `/v1/shifts` | supervisor | Create (DRAFT) |
| PATCH | `/v1/shifts/{id}` | supervisor | Modify — re-runs conflict detection |
| POST | `/v1/shifts/{id}/publish` | supervisor | DRAFT → PUBLISHED, emits `shift.published` |
| POST | `/v1/shifts/{id}/cancel` | supervisor | Emits `shift.cancelled` |
| POST | `/v1/shifts/{id}/assignments` | supervisor | Assign worker(s); 409 on conflict/cert failure |
| POST | `/v1/shifts/{id}/confirm` | worker | Acknowledge assignment |
| POST | `/v1/swaps` | worker | Propose swap |
| POST | `/v1/swaps/{id}/approve` | supervisor | One-tap approve |
| GET | `/v1/shifts/export?format=pdf\|csv` | supervisor | Compliance export |

### 9.3 Attendance Service
| Method | Route | Role | Purpose |
|---|---|---|---|
| POST | `/v1/attendance/qr/generate` | supervisor | Returns `{ token, expiresAt }` (90s TTL) |
| POST | `/v1/attendance/checkin` | worker | Body: `{ clientUuid, shiftId, method, qrToken?, lat, lng, capturedAt, deviceId }` |
| POST | `/v1/attendance/checkout` | worker | Same idempotency contract |
| POST | `/v1/attendance/sync` | worker | **Batch** upload of queued offline records |
| GET | `/v1/attendance/live?zone` | supervisor | Live headcount (served from Redis) |
| GET | `/v1/attendance/me?from&to` | worker | My own history |

### 9.4 Fatigue Engine
| Method | Route | Role | Purpose |
|---|---|---|---|
| GET | `/v1/fatigue/me` | worker | My current score + risk level |
| GET | `/v1/fatigue/users/{id}` | supervisor | A worker's score + 30-day trend |
| GET | `/v1/fatigue/heatmap?deptId&week` | supervisor | Weekly team heatmap |
| POST | `/v1/fatigue/self-report` | worker | Sleep hours + alertness (1–5) |
| POST | `/v1/fatigue/alerts/{id}/override` | supervisor | **Requires `reason` ≥ 20 chars** → audit_log |
| POST | `/v1/fatigue/score` | internal | Recompute (called by Kafka consumer) |

### 9.5 Emergency Service
| Method | Route | Role | Purpose |
|---|---|---|---|
| POST | `/v1/musters` | supervisor/safety | Initiate — snapshots expected headcount |
| POST | `/v1/musters/{id}/respond` | worker | "I'm safe" |
| POST | `/v1/musters/{id}/mark` | supervisor | Manually mark a worker present |
| POST | `/v1/musters/{id}/close` | safety/admin | Close roll-call |
| WS | `/v1/musters/{id}/live` | supervisor/safety | Real-time completion stream |

### 9.6 Standard responses

```json
// 201 Created — check-in accepted
{ "id": "…", "status": "CHECKED_IN", "capturedAt": "2026-07-13T06:02:11Z",
  "fatigueRisk": "ADVISORY" }

// 409 Conflict — blocked
{ "error": "FATIGUE_CRITICAL",
  "message": "Worker fatigue score 88 (CRITICAL). Supervisor override required.",
  "alertId": "…" }

// 422 — QR expired
{ "error": "QR_EXPIRED", "message": "Code expired 12s ago. Ask supervisor to refresh." }
```

Error envelope is uniform: `{ error, message, details?, traceId }`. `traceId` propagates across all services for debugging.

---

## 10. Core Data Flows

### 10.1 Check-in (online, QR)

```
Worker taps Scan
   → App reads QR → POST /v1/attendance/checkin { qrToken, clientUuid, lat, lng, capturedAt }
      → Gateway validates JWT
      → Attendance Svc:
          1. Look up qrToken in Redis (O(1), TTL-backed). Expired/absent → 422.
          2. Verify HMAC signature matches shift_id.
          3. Verify worker has an ASSIGNED/CONFIRMED assignment on that shift → else 403.
          4. PostGIS: ST_Contains(dept.geofence, point(lat,lng)) → else 403.
          5. Check latest fatigue_scores.risk_level:
                CRITICAL and no active override → 409 FATIGUE_CRITICAL (block).
          6. INSERT attendance_records (idempotent on client_uuid).
          7. INCR Redis headcount:{zone}
          8. Publish attendance.checked_in
      ← 201 in <500ms. Worker walks through.

   Asynchronously, off the event:
      Fatigue Engine recomputes score → publishes fatigue.scored (+ fatigue.alert if raised)
      Emergency Svc updates its live roster
      Reporting Svc appends to its read model
      Notification Svc pushes a fatigue warning if the level changed
```

### 10.2 Fatigue alert → block

```
attendance.checked_out (10h shift, 3rd consecutive night)
   → Fatigue Engine: recompute → score 88 → CRITICAL
   → INSERT fatigue_scores, fatigue_alerts
   → publish fatigue.alert { user_id, CRITICAL }
        ├─> Notification Svc → push to worker + push to supervisor + SMS to safety officer
        └─> Shift Svc → flags the worker's next assignment as REQUIRES_OVERRIDE

Next shift, worker attempts check-in → Attendance Svc step 5 → 409 blocked.
Supervisor opens alert → POST /v1/fatigue/alerts/{id}/override { reason: "…" }
   → reason < 20 chars → 400. Reason recorded → audit_log → override valid for THAT shift only.
```

### 10.3 Emergency muster

```
Safety Officer taps EMERGENCY
   → POST /v1/musters { zone }
   → Emergency Svc:
       1. Read live headcount from Redis → snapshot expected_workers (frozen).
       2. INSERT emergency_musters + one muster_responses row per on-site worker (UNACCOUNTED).
       3. publish muster.initiated
   → Notification Svc: push + SMS to every on-site worker simultaneously.
   → Supervisor dashboard opens WS /v1/musters/{id}/live

Each worker taps "I'm Safe" → POST respond → status PRESENT → WS broadcast
   → Dashboard: 47 / 52 accounted · 5 UNACCOUNTED (names + last known zone + last check-in time)

Target: full headcount < 3 minutes.
```

---

## 11. Offline-First Strategy

This is the part that will make or break the demo. Underground = no signal, no exceptions.

**Local store (SQLite on device):**

```sql
-- outbox: writes waiting to reach the server
CREATE TABLE outbox (
  client_uuid TEXT PRIMARY KEY,     -- generated on device = idempotency key
  endpoint    TEXT NOT NULL,        -- '/v1/attendance/checkin'
  payload     TEXT NOT NULL,        -- JSON
  captured_at TEXT NOT NULL,
  attempts    INTEGER DEFAULT 0,
  last_error  TEXT,
  status      TEXT DEFAULT 'PENDING' -- PENDING|SENT|FAILED
);

-- cache: read-side data pre-downloaded before going underground
CREATE TABLE cached_shifts    (id TEXT PRIMARY KEY, json TEXT, cached_at TEXT);
CREATE TABLE cached_qr_secret (shift_id TEXT PRIMARY KEY, secret TEXT, valid_until TEXT);
```

**The rules:**

1. **Write locally first, always.** Every check-in writes to `outbox` and updates the UI optimistically. The network call is a *background* attempt.
2. **`client_uuid` is generated on the device.** The server's `UNIQUE (client_uuid)` constraint means a record replayed five times still inserts once. This is the whole trick — idempotency lives in the key, not in clever retry logic.
3. **`captured_at` is the device clock; `synced_at` is the server clock.** Both are stored. If the device clock is more than 10 minutes off server time (checked at last sync), the record is flagged `requires_review` rather than silently trusted.
4. **Offline QR validation.** The app pre-downloads a short-lived HMAC secret for the shift before descending. It can then validate the QR locally without a round trip, and the server *re-validates* the token on sync. If it fails server-side, the record is flagged, not deleted — a human decides.
5. **Sync on reconnect.** A background task (`expo-task-manager` + NetInfo listener) flushes the outbox in `captured_at` order via `POST /v1/attendance/sync` (batch, max 200). Exponential backoff on failure.
6. **The UI never lies.** A pending record shows a ⏳ badge until the server confirms. A worker must always be able to see "3 check-ins waiting to sync."

**Deliberate trade-off:** fatigue blocking (§10.2 step 5) cannot be enforced offline with certainty, because the device may hold a stale score. Mitigation: the fatigue score is pushed to the device with the roster before descent, and a CRITICAL worker's app refuses local check-in. A worker who becomes CRITICAL *while* offline is caught on sync and flagged retroactively. This limitation must be stated openly to the client — silent gaps in a safety system are worse than known ones.

---

## 12. Fatigue Engine Specification

**Inputs** (per worker, rolling window):
- `hours_worked_24h`, `hours_worked_7d` — derived from `attendance_records`
- `night_shifts_7d` — count of `shift_type = 'NIGHT'`
- `consecutive_days` — unbroken run of worked days
- `sleep_hours`, `alertness` — from `fatigue_self_reports` (optional; model degrades gracefully)

**Model:** a biomathematical fatigue model in the FAID/FAST family, combining a homeostatic sleep-pressure term with a circadian term. For the competition build, implement a documented, weighted approximation and version it (`model_version`), then swap in a licensed/validated implementation for production.

```python
# fatigue/scoring.py — illustrative, not final
def score(f: FatigueInputs) -> tuple[int, RiskLevel]:
    s = 0
    s += min(f.hours_24h / 12, 1.0) * 30          # acute load
    s += min(f.hours_7d / 60, 1.0) * 20           # cumulative load
    s += min(f.night_shifts_7d / 4, 1.0) * 20     # circadian disruption
    s += min(f.consecutive_days / 7, 1.0) * 15    # no recovery day
    if f.sleep_hours is not None:
        s += max(0, (8 - f.sleep_hours) / 8) * 15 # sleep debt
    score = round(min(s, 100))
    return score, band(score)

def band(s: int) -> RiskLevel:
    if s >= 80: return RiskLevel.CRITICAL    # red   — check-in blocked
    if s >= 60: return RiskLevel.WARNING     # orange— supervisor notified
    if s >= 40: return RiskLevel.ADVISORY    # yellow— worker notified
    return RiskLevel.LOW
```

**Non-negotiables:**
- Every score persists its `model_version`. When the model changes, historical scores remain interpretable. This is a compliance requirement, not a nicety.
- The engine is **stateless**: it reads inputs, returns a score. All state lives in Postgres. This makes it trivially horizontally scalable and testable.
- A CRITICAL score **blocks**, it does not merely warn. A safety system that can be ignored by default is decoration.
- Every override is logged with a mandatory free-text reason and the supervisor's identity. This is the artefact a regulator will ask for.

**Honest caveat for the pitch:** FAID and FAST are commercially licensed models. Describe the engine as *"FAID/FAST-family biomathematical scoring, pluggable"* — do not claim to have implemented the licensed algorithms unless you have licensed them. Judges with domain knowledge will ask.

---

## 13. Security Architecture

| Concern | Control |
|---|---|
| Authentication | JWT (RS256). Access token 15 min, refresh token 30 days, rotated on use. |
| Token validation | Once, at Spring Cloud Gateway. Downstream services trust the propagated `X-User-Id` / `X-User-Role` headers **only on the internal network**. |
| Authorization | Role in JWT claim + method-level `@PreAuthorize` + row-level department scoping. |
| Passwords | BCrypt cost 12. Never logged, never returned. |
| QR anti-spoofing | HMAC-SHA256 over `shift_id \| time_window \| server_secret`, 90s TTL in Redis. A screenshot is worthless 90 seconds later. |
| GPS spoofing | Server-side PostGIS containment check + `device_id` binding (one active device per worker) + mock-location detection flag from Expo. |
| Buddy-punching | Attendance requires *both* a valid QR/geofence *and* an active assignment on that shift for that user. A worker cannot scan for a friend without the friend's authenticated device. |
| Transport | TLS 1.3 everywhere. Certificate pinning on the mobile client. |
| Secrets | Environment variables / Docker secrets. **Never** committed. `.env.example` in the repo, `.env` in `.gitignore`. |
| Rate limiting | Gateway: 100 req/min per user, 10 req/min on `/auth/login` (brute-force). |
| Audit | Append-only `audit_log` for every fatigue override, shift cancellation, and role change. No DELETE grant. |
| PII | Location data retained 90 days then aggregated. Workers can request their own record (GDPR-style, and increasingly Ghana's Data Protection Act 2012). |

---

## 14. Project File Structures

### 14.1 Mobile — Expo (React Native)

Package **by feature**, not by type. Each folder owns its whole vertical slice.

```
shiftsync-mobile/
├── app/                          # expo-router
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (worker)/
│   │   ├── _layout.tsx           # tab bar
│   │   ├── index.tsx             # my shifts
│   │   ├── checkin.tsx
│   │   ├── scanner.tsx           # QR camera
│   │   ├── fatigue.tsx
│   │   └── notifications.tsx
│   ├── (supervisor)/
│   │   ├── roster.tsx
│   │   ├── headcount.tsx
│   │   ├── qr-display.tsx
│   │   └── muster.tsx
│   └── _layout.tsx               # root: auth guard + sync provider
├── src/
│   ├── features/
│   │   ├── auth/                 # api.ts, hooks.ts, types.ts, components/
│   │   ├── shifts/
│   │   ├── attendance/
│   │   ├── fatigue/
│   │   ├── notifications/
│   │   └── muster/
│   ├── offline/
│   │   ├── db.ts                 # SQLite init + migrations
│   │   ├── outbox.ts             # enqueue / flush / retry
│   │   ├── sync-manager.ts       # NetInfo listener + background task
│   │   └── idempotency.ts        # client_uuid generation
│   ├── api/
│   │   ├── client.ts             # fetch wrapper: base URL, JWT, refresh-on-401
│   │   └── endpoints.ts          # one place for every route string
│   ├── components/ui/            # Button, Card, Badge, StatusPill
│   ├── hooks/
│   ├── store/                    # zustand: session, sync status
│   ├── theme/                    # colors, spacing, typography
│   └── utils/
├── assets/
├── app.json
├── tsconfig.json
└── package.json
```

### 14.2 Backend — Spring Boot microservice (repeat per service)

```
shiftsync-backend/
├── docker-compose.yml            # postgres, kafka, redis, all services
├── gateway/
│   └── src/main/java/io/shiftsync/gateway/
│       ├── GatewayApplication.java
│       ├── config/RouteConfig.java
│       ├── filter/JwtAuthFilter.java
│       └── filter/RateLimitFilter.java
├── shift-service/
│   ├── src/main/java/io/shiftsync/shift/
│   │   ├── ShiftApplication.java
│   │   ├── api/                  # @RestController + DTOs (request/response)
│   │   │   ├── ShiftController.java
│   │   │   ├── SwapController.java
│   │   │   └── dto/
│   │   ├── domain/               # @Entity, enums, value objects
│   │   │   ├── Shift.java
│   │   │   ├── ShiftAssignment.java
│   │   │   └── ShiftStatus.java
│   │   ├── repository/           # Spring Data JPA
│   │   ├── service/              # BUSINESS RULES LIVE HERE. Nowhere else.
│   │   │   ├── ShiftService.java
│   │   │   ├── ConflictDetector.java
│   │   │   └── SwapWorkflow.java
│   │   ├── event/                # KafkaProducer + KafkaConsumer
│   │   ├── config/               # SecurityConfig, KafkaConfig
│   │   └── exception/            # GlobalExceptionHandler → uniform error envelope
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/         # Flyway: V1__init.sql, V2__add_templates.sql
│   ├── src/test/java/            # unit (Mockito) + integration (Testcontainers)
│   └── Dockerfile
├── auth-service/                 # same layout
├── user-service/                 # same layout
├── attendance-service/           # same layout
├── notification-service/         # same layout
├── reporting-service/            # same layout
└── emergency-service/            # same layout
```

### 14.3 Fatigue Engine — Python FastAPI

```
fatigue-engine/
├── app/
│   ├── main.py                   # FastAPI app + routers
│   ├── api/routes.py
│   ├── models/schemas.py         # Pydantic request/response
│   ├── core/
│   │   ├── scoring.py            # THE model. Pure functions. Fully unit-tested.
│   │   ├── bands.py              # risk-level thresholds
│   │   └── version.py            # MODEL_VERSION = "1.0.0"
│   ├── consumers/kafka.py        # consumes attendance.* → recompute → publish
│   ├── db/repository.py          # SQLAlchemy
│   └── config.py
├── tests/test_scoring.py         # golden-case tests: known inputs → known scores
├── requirements.txt
└── Dockerfile
```

### 14.4 Admin Portal — Next.js

```
shiftsync-admin/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── dashboard/page.tsx        # live headcount (WebSocket)
│   ├── roster/page.tsx           # drag-and-drop scheduler
│   ├── fatigue/page.tsx          # heatmap
│   ├── muster/[id]/page.tsx      # live muster (WebSocket)
│   ├── reports/page.tsx
│   └── layout.tsx
├── components/
│   ├── roster/DragDropCalendar.tsx
│   ├── fatigue/Heatmap.tsx
│   └── ui/
├── lib/
│   ├── api.ts
│   ├── ws.ts                     # reconnecting WebSocket client
│   └── auth.ts
└── package.json
```

---

## 15. Caching Strategy (Redis)

| Key | Value | TTL | Why |
|---|---|---|---|
| `qr:{token}` | `{ shiftId, generatedAt }` | 90s | Native TTL = self-expiring QR. No cron job, no stale-code bug. |
| `headcount:{zone}` | integer | none (INCR/DECR) | Sub-100ms dashboard refresh without hammering Postgres. |
| `roster:{deptId}:{week}` | JSON | 5 min | Published rosters are read constantly, written rarely. |
| `fatigue:{userId}` | `{ score, level }` | 15 min | Read on every check-in. Invalidated on `fatigue.scored`. |
| `session:{userId}:devices` | set | 30d | Device binding for anti-spoofing. |

**Redis is a cache, never a source of truth.** If Redis is wiped, every value must be rebuildable from Postgres. The headcount counter is reconciled against `attendance_records` every 60 seconds.

---

## 16. Non-Functional Requirements

| # | Requirement | Target |
|---|---|---|
| NFR-1 | Check-in response time | p95 < 500ms |
| NFR-2 | Live headcount dashboard refresh | < 100ms (Redis-served) |
| NFR-3 | Shift-change push delivery | < 10s from publish to device |
| NFR-4 | Full emergency muster completion | < 3 minutes for 500 workers |
| NFR-5 | Offline capacity | 500 queued records / 72 hours without data loss |
| NFR-6 | Concurrent users per site | 2,000 workers, 5,000 req/min peak (shift change) |
| NFR-7 | Availability | 99.5% (on-prem deployments must survive internet loss) |
| NFR-8 | Fatigue score freshness | recomputed within 60s of any check-in/out |
| NFR-9 | Data retention | Attendance & fatigue: 5 years (regulatory). Location points: 90 days. |
| NFR-10 | Recovery | RPO 15 min, RTO 1 hour. Nightly full + WAL archiving. |

**The load spike to design for:** shift change. 800 workers scan QR codes within a 10-minute window. That is the peak, and it is entirely predictable. Load-test *that*, not an average.

---

## 17. Engineering Standards

- **Language:** Java 21 (backend), TypeScript strict mode (clients), Python 3.11 + type hints (engine).
- **Migrations:** Flyway (Java services), Alembic (Python). Schema is never changed by hand — ever, in any environment.
- **Validation:** Bean Validation (`@Valid`) on every DTO. Pydantic on every FastAPI route. Reject at the boundary.
- **Testing:**
  - Unit: JUnit 5 + Mockito on the service layer. `pytest` on `scoring.py` with golden cases.
  - Integration: Testcontainers (real Postgres, real Kafka). Not H2 — H2 lies about Postgres behaviour.
  - Coverage gate: ≥70% on service layer, **≥90% on `fatigue/scoring.py`** (it is safety-critical).
  - E2E: Detox or Maestro on the mobile app for the check-in happy path.
- **API contract:** OpenAPI 3 generated per service, aggregated at the gateway. Contract-first for anything client-facing.
- **Git:** trunk-based with short-lived feature branches → PR → review → main. Conventional Commits.
- **CI (GitHub Actions):** on every PR — build, unit test, integration test, lint, `docker build`. On merge to main — push images, deploy to staging.
- **Observability:**
  - Structured JSON logging (SLF4J + Logback), `traceId` propagated through every service and every Kafka event.
  - Spring Boot Actuator `/health`, `/metrics` → Prometheus → Grafana.
  - Alert on: Kafka consumer lag > 1000, fatigue recompute latency > 60s, failed offline syncs.

---

## 18. Deployment & Infrastructure

**Two deployment targets — this is a real requirement, not a nice-to-have.** Ghanaian mine sites have unreliable upstream internet. A cloud-only architecture strands the site during an outage, at exactly the moment when a muster might be needed.

| Mode | Where | Notes |
|---|---|---|
| **Cloud** | AWS/GCP — ECS/GKE, RDS Postgres, MSK/Confluent Kafka, ElastiCache | Default for multi-site enterprise customers. |
| **On-premise** | Single server at the mine, Docker Compose | Full stack runs locally. Syncs to cloud when the link is up. Site survives an internet outage. |

```yaml
# docker-compose.yml (abridged)
services:
  postgres:   { image: postgis/postgis:16-3.4, volumes: [pgdata:/var/lib/postgresql/data] }
  redis:      { image: redis:7-alpine }
  kafka:      { image: bitnami/kafka:3.7 }        # KRaft mode, no Zookeeper
  gateway:    { build: ./gateway,             ports: ["8080:8080"] }
  auth:       { build: ./auth-service }
  user:       { build: ./user-service }
  shift:      { build: ./shift-service }
  attendance: { build: ./attendance-service }
  notification: { build: ./notification-service }
  fatigue:    { build: ./fatigue-engine }
  reporting:  { build: ./reporting-service }
  emergency:  { build: ./emergency-service }
  admin:      { build: ./shiftsync-admin,     ports: ["3000:3000"] }
```

**Environments:** `local` (compose) → `staging` (cloud, seeded demo data) → `prod`.

---

## 19. Build Order (8 Sprints)

| Sprint | Deliverable | Definition of Done |
|---|---|---|
| **1** | Foundation | Postgres schema + Flyway V1. Gateway + service skeletons up in Docker Compose. Expo app with navigation shell. Kafka topics created. |
| **2** | Auth, Users, Shifts | Register/login/JWT end-to-end. Roster CRUD. **Conflict detection + certification check working with tests.** |
| **3** | Attendance + Offline | QR generate/validate (HMAC + Redis TTL). PostGIS geofence check. **SQLite outbox + sync working with the network switched off.** |
| **4** | Notifications & Swaps | Kafka wired end-to-end. FCM push + Twilio SMS. Acknowledgement + escalation. Swap workflow. |
| **5** | Mobile UI | All worker + supervisor screens. Offline status badges. QR scanner. |
| **6** | Fatigue Engine | FastAPI service. Scoring module with golden tests. Three-tier alerts. **Blocking + override with mandatory reason.** |
| **7** | Emergency + Admin Portal | Muster service + WebSockets. Next.js: live headcount, drag-drop roster, fatigue heatmap. |
| **8** | Harden & Ship | Integration tests. Load test the shift-change spike. Dockerise everything. Demo script + seeded data. |

> **Do sprint 3 (offline) before sprint 5 (UI).** It is tempting to build the pretty screens first, but offline sync will force schema and API changes. Build the hard, load-bearing thing while there is still time to be wrong about it.

---

## 20. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Offline sync produces duplicate or lost records | High | Critical | `client_uuid` idempotency key + UNIQUE constraint. Test by killing the app mid-sync. |
| Device clock manipulation to fake hours | Medium | High | Store both `captured_at` and `synced_at`; flag drift > 10 min for review. |
| GPS spoofing apps | Medium | High | Server-side PostGIS check + device binding + Expo mock-location flag. QR is the primary method; GPS is the fallback. |
| Kafka adds operational complexity a 1-person team can't carry | **High** | Medium | **Consider a modular monolith with an outbox table for the competition build**, and extract services later. Kafka is the right *production* answer, not necessarily the right *8-week* answer. Be ready to defend this to judges either way. |
| FAID/FAST licensing | Medium | Medium | Present as "FAID/FAST-family, pluggable." Do not claim licensed implementations you do not have. |
| Underground connectivity worse than assumed | High | High | Offline-first is non-negotiable. Validate on-site early with a real device in a real tunnel. |
| Workers without smartphones | High | Medium | SMS fallback + supervisor-assisted manual check-in (`method = 'MANUAL'`, always audited). |
| Scope: 12 features in 8 weeks, solo | **Very High** | **Critical** | Ruthlessly rank. Non-negotiable core: shift scheduling, QR attendance, offline sync, fatigue engine, muster. Everything else is a stretch goal. A working core beats twelve half-features. |

---

## Appendix A — Assumptions

1. Each mine site has at least one surface location with connectivity (the muster point / supervisor office).
2. Workers carry either a smartphone or an employee ID card readable at a supervisor-operated terminal.
3. The mine can supply department/zone boundaries as coordinates for geofence setup.
4. Payroll integration is out of scope for v1; attendance data is exported (CSV) rather than pushed.

## Appendix B — Out of Scope (v1)

- Biometric (fingerprint/facial) attendance
- Equipment and asset tracking
- Payroll calculation and disbursement
- Multi-language support (English only in v1)
- Wearable device integration for physiological fatigue signals
