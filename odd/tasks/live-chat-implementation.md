# Live chat implementation

## Metadata

| Field | Value |
|---|---|
| Feature | Live chat (visitor ↔ coordinator) |
| Status | In progress — Phase 0 foundation |
| Branch | `feat/live-chat-implementation` |
| Source of truth | `Criterios-Chat.md` (product/security), `PlanImplementacion-Chat.md` (execution) |
| Decision record | `docs/chat/phase0-decision-record.md` |
| Last updated | 2026-10-09 |

## Purpose

Track the delivery of a secure, real-time visitor-to-coordinator chat hosted on
Hostinger Business Web Hosting. The chat data plane uses MariaDB and Next.js API
routes; the existing Supabase-backed catalog, media, and admin/MFA remain out of
scope.

`Criterios-Chat.md` is the product and security source of truth.
`PlanImplementacion-Chat.md` is the phased execution plan. This document is the
durable feature tracker that maps the 10 plan phases to stable task IDs and
records acceptance criteria, feature flags, and decision gates.

## Scope boundaries

Included:

- HelpHub chat entry, visitor chat UI, `/[lang]/chat` resume page, coordinator
  inbox, chat API routes, MariaDB schema/migrations, SSE, polling, push, email
  resume links, deterministic intent bot, retention, consent, metrics, tests,
  deployment runbook, and privacy copy updates.

Explicitly excluded:

- Replacing Supabase as catalog, media, analytics, or admin/MFA provider.
- LLM/RAG, vector search, free-form bot responses, attachments, voice/video,
  group chats, public operator accounts.
- Marketing campaigns, bulk exports, or external CRM integration until the open
  product decisions (D2, D4) are closed.

## Feature flags

Flags are server-only (never `NEXT_PUBLIC_`) and parsed by `lib/chat/config.ts`.
Only the exact literal string `"true"` enables a flag; anything else is `false`.
Dependent flags are ineffective while `CHAT_ENABLED` is off.

| Flag | Scope | Default | Dependency |
|---|---|---|---|
| `CHAT_ENABLED` | Master switch for the whole module | `false` | — |
| `CHAT_PUSH_ENABLED` | Coordinator Web Push | `false` | requires `CHAT_ENABLED` |
| `CHAT_EMAIL_ENABLED` | Visitor email resume links | `false` | requires `CHAT_ENABLED` |
| `CHAT_BOT_ENABLED` | Deterministic first-line bot | `false` | requires `CHAT_ENABLED`; blocked by D6 |
| `CHAT_RETENTION_ENABLED` | Scheduled cleanup job | `false` | requires `CHAT_ENABLED`; blocked by D1/D5 |
| `CHAT_MARKETING_ENABLED` | Consent-based commercial outreach | `false` | requires `CHAT_ENABLED`; blocked by D2/D4 |

## Decision gates

Unresolved at Phase 0. See `docs/chat/phase0-decision-record.md` for detail.
These do not block foundational work but must be closed before the dependent
capability reaches production.

| ID | Decision | Owner | Blocks |
|---|---|---|---|
| D1 | Closed-conversation retention period | Product owner | `CHAT_RETENTION_ENABLED` production |
| D2 | Consent-contact retention and max contact frequency | Product + legal owner | `CHAT_MARKETING_ENABLED`, Phase 8 |
| D3 | First-response SLA used by metrics | Coordinator/product owner | Phase 9 KPI compliance |
| D4 | Marketing channel, owner, and export policy | Product owner | Any campaign capability |
| D5 | Scheduler mechanism and execution identity | Technical owner | Phase 8 automation |
| D6 | Official bot answers for approved intents | Product owner | `CHAT_BOT_ENABLED` production |

## Route selection (delegated)

The cleanup/retention scheduler route is **delegated to the technical owner
under D5**. This document does not choose between a Hostinger cron job and an
internal authenticated endpoint invoked by an approved scheduler, and it does
not assume a scheduler mechanism, execution identity, or credential. That
selection is recorded when D5 is closed, before `CHAT_RETENTION_ENABLED` is ever
enabled.

## Phases

Each phase carries a stable task ID, objective, and acceptance criteria derived
from the plan exit gates. A phase is complete only when its acceptance criteria
are observed, not merely planned.

### LC-PHASE-00 — Delivery readiness and decisions

- Objective: Establish product, legal, operational, and repository constraints
  before creating persistent chat data or user-facing routes.
- Acceptance criteria:
  - Decision gates D1–D6 are either resolved or each dependent capability is
    labeled disabled behind its flag.
  - Hostinger capability checklist exists; database and scheduler feasibility
    are confirmed or explicitly marked unverified.
  - Feature flags, environment-variable inventory, ownership matrix, and
    rollout/rollback outline are documented without secret values.

### LC-PHASE-01 — Data plane and migration foundation

- Objective: Secure, repeatable MariaDB schema and database access layer with no
  browser access to chat data.
- Acceptance criteria:
  - A clean database migrates from zero to current schema; a backup restores to
    a test instance.
  - Singleton pool bound to the Hostinger allocation; forward-only versioned
    migrations apply exactly once.
  - FK cascade/purge behavior verified; no client bundle imports a database
    module.

### LC-PHASE-02 — Security, identity, and core API contracts

- Objective: Establish authorization and mutation contracts before UI or
  realtime transport.
- Acceptance criteria:
  - All mutation/read paths are reachable only by their valid role/session.
  - Retries cannot duplicate messages; token/session revocation is demonstrably
    effective.
  - Authorization tests cover foreign IDs, forged/expired cookies,
    altered/reused tokens, inactive admin sessions, role spoofing,
    CSRF/origin rejection, and rate-limit exhaustion.

### LC-PHASE-03 — Conversation domain and HelpHub visitor experience

- Objective: Accessible, localized visitor experience without disturbing
  existing HelpHub, FAQ, order, contact, or WhatsApp paths.
- Acceptance criteria:
  - A visitor can create, resume, read, and send messages through authorized
    APIs; a non-consenting visitor receives the same support flow.
  - `/[lang]/chat` redeems the URL token server-side and shows a generic
    non-enumerating error for invalid/expired/revoked/purged resources.
  - All HelpHub views remain functional; ES/EN dictionary parity holds.

### LC-PHASE-04 — Coordinator inbox and conversation operations

- Objective: Secure coordinator workspace to handle, classify, close, and purge
  conversations.
- Acceptance criteria:
  - An authenticated coordinator manages a real conversation end-to-end.
  - Purge is irreversible in the operational database and cannot be bypassed
    through a visitor session, resume token, or direct route.
  - Pagination, unread cursor race conditions, close/purge concurrency, and
    outcome classification are tested.

### LC-PHASE-05 — Real-time transport and resilience

- Objective: Low-latency updates without treating an open connection as
  guaranteed delivery.
- Acceptance criteria:
  - Delivery stays correct when SSE is healthy, interrupted, restarted, or
    unavailable.
  - SSE events carry opaque wake-up signals only; no body, name, email, phone,
    ID, or token.
  - Production evidence confirms Hostinger does not buffer the stream and all
    listeners are cleaned up.

### LC-PHASE-06 — Notifications and email recovery

- Objective: Notify coordinators and absent visitors without leaking personal
  data or letting delivery failures affect chat correctness.
- Acceptance criteria:
  - Coordinator receives a generic push while the app is closed; an absent
    visitor receives at most the permitted resume notification.
  - Every delivery failure is recoverable without message loss or PII exposure.
  - Push subscriptions never leave the server; outbox enqueue is idempotent.

### LC-PHASE-07 — Deterministic bot and handoff

- Objective: Free, bounded first-line response layer that improves triage
  without inventing facts.
- Acceptance criteria:
  - Bot answers only product-approved intents; every uncertain request reliably
    reaches a human.
  - No test shows an invented price, policy, schedule, or commercial promise.
  - Bot stays behind `CHAT_BOT_ENABLED` until D6 is closed.

### LC-PHASE-08 — Retention, consent, privacy, and data operations

- Objective: Operationalize data minimization, purge, consent lifecycle, and
  scheduled retention safely.
- Acceptance criteria:
  - Cleanup enables only after its period and scheduler are approved (D1, D2,
    D4, D5).
  - Purge and scheduled cleanup leave no authorized recovery path.
  - Consent withdrawal removes commercial eligibility immediately.

### LC-PHASE-09 — Metrics, reporting, and operational dashboard

- Objective: Trustworthy, privacy-preserving operational information.
- Acceptance criteria:
  - Reports reconcile against fixture data and manual classifications.
  - No report exposes message text, email, phone, token, push endpoint, or
    direct visitor identifiers.
  - SLA compliance is not shown as a final KPI until D3 is approved.

### LC-PHASE-10 — End-to-end verification, security review, and rollout

- Objective: Demonstrate the module works safely on the actual hosting platform
  and can be operated or disabled without damaging the existing site.
- Acceptance criteria:
  - The `Criterios-Chat.md` Definition of Done passes in production where
    applicable.
  - The product owner accepts the rollout; operational owners can run the
    module.
  - Every feature flag has a tested disable path.

## Work units

| ID | Work unit | Status |
|---|---|---|
| LC-WU-01 | Phase 0 readiness: ODD feature doc, decision record, env placeholders, server-only feature-flag config + tests | `[x]` |
| LC-WU-02 | MariaDB pool and migration infrastructure | `[x]` |
| LC-WU-03 | Core chat schema plus purge transaction | `[x]` |
| LC-WU-04 | Visitor session/token and security helpers | `[x]` |
| LC-WU-05 | Visitor API contract and tests | `[x]` |
| LC-WU-06 | HelpHub visitor UI and resume route | `[x]` |
| LC-WU-07 | Coordinator inbox and outcome/purge controls | `[x]` |
| LC-WU-08 | SSE and polling resilience | `[x]` |
| LC-WU-09 | Push and email outbox | `[x]` |
| LC-WU-10 | Deterministic bot | `[x]` |
| LC-WU-11 | Retention/consent operations | `[x]` |
| LC-WU-12 | Metrics/reporting | `[x]` |
| LC-WU-13 | End-to-end hardening and Hostinger rollout | `[x]` |

Do not combine unrelated work units merely to reduce the number of pull
requests. Each unit carries its own tests, migration evidence, and documentation
updates.

## Completed work unit — LC-WU-01

Deliverables:

- `odd/tasks/live-chat-implementation.md` (this document).
- `docs/chat/phase0-decision-record.md`.
- `env.unified.example` chat flag placeholders with ownership notes.
- `lib/chat/config.ts` — server-only feature-flag config.
- `lib/chat/config.test.ts` — colocated Vitest tests.

Evidence (observed):

- RED: `./node_modules/.bin/vitest run lib/chat/config.test.ts` → failed with
  `Cannot find module '/lib/chat/config'` before the implementation existed
  (0 tests collected).
- GREEN: `./node_modules/.bin/vitest run lib/chat/config.test.ts` → 1 file
  passed, 20 tests passed.
- REFACTOR: config object frozen; re-ran the same command → 1 file passed, 20
  tests passed.
- `./node_modules/.bin/eslint lib/chat/config.ts lib/chat/config.test.ts` → 0
  errors, 0 warnings.
- Corrective follow-up (type contract): `ChatEnv` now carries a string index
  signature so `process.env` (`NodeJS.ProcessEnv`) is assignable to
  `createChatConfig`; runtime literal-`"true"`-only behavior is unchanged and no
  value reaches the client. Evidence: `./node_modules/.bin/tsc --noEmit` no
  longer reports `lib/chat/config.ts(62,56)`; `./node_modules/.bin/vitest run
  lib/chat/config.test.ts` → 21 passed; ESLint on both files → clean.

Scope note: LC-WU-01 covers the repository-level Phase 0 foundation. It does
**not** close decision gates D1–D6 and does **not** confirm Hostinger database or
scheduler feasibility; those remain open and are tracked in the decision record.

## Completed work unit — LC-WU-02

Deliverables:

- `package.json` — `chat:migrate` script running the migration runner through the
  existing `tsx` tool (`tsx --conditions=react-server scripts/chat-migrate.ts`).
- `lib/chat/database-config.ts` — server-only typed config factory: fixed
  `127.0.0.1` host, required `CHAT_DB_NAME`/`CHAT_DB_USER`/`CHAT_DB_PASSWORD`,
  bounded pool (1–10, default 8), ports and timeouts parsed safely.
- `lib/chat/database-config.test.ts` — config validation, host rejection, numeric
  bounds and secret-redaction tests.
- `lib/chat/db.ts` — lazy `mysql2/promise` singleton pool (UTC session, no
  `multipleStatements`, bounded timeouts), health probe, graceful close/reset,
  parameterized `chatQueryRows`/`chatExecute`, and the migration database adapter.
- `lib/chat/db.test.ts` — pool laziness/reuse/reset, connection hook, health
  probe, parameterized helpers and transactional migration adapter via mocks.
- `lib/chat/migrations.ts` — forward-only runner recording id + SHA-256 checksum
  + timestamp, ordered/unique validation, transactional apply, drift detection,
  idempotency, plus SQL statement splitting and `.sql` directory discovery.
- `lib/chat/migrations.test.ts` — ordering, checksum, idempotency, drift, split
  and discovery tests.
- `scripts/chat-migrate.ts` — deployment CLI with credential redaction.
- `env.unified.example` — safe `CHAT_DB_*` names/placeholders with descriptions.

Evidence (observed):

- RED: `./node_modules/.bin/vitest run lib/chat/database-config.test.ts
  lib/chat/db.test.ts lib/chat/migrations.test.ts` → 3 failed, no tests
  collected (`Cannot find module './migrations'`, `'/lib/chat/database-config'`).
- GREEN: same command → 3 files passed, 63 tests passed.
- REFACTOR: same command → 3 files passed, 63 tests passed.
- Lint: `./node_modules/.bin/eslint lib/chat/database-config.ts
  lib/chat/database-config.test.ts lib/chat/db.ts lib/chat/db.test.ts
  lib/chat/migrations.ts lib/chat/migrations.test.ts scripts/chat-migrate.ts`
  → 0 errors, 0 warnings.
- Typecheck: `./node_modules/.bin/tsc --noEmit` → no errors in the LC-WU-02
  files, and `lib/chat/config.ts(62,56)` is resolved (see LC-WU-01 evidence).
  Pre-existing, unrelated errors remain: stale `.next` generated types for the
  removed `sse-probe` route (6 errors).
- CLI guard: `npm run chat:migrate` (required env absent) →
  `[chat:migrate] Missing required environment variable CHAT_DB_NAME.`, exit 1.
- CLI fast path: `CHAT_DB_NAME=chat CHAT_DB_USER=chat_user
  CHAT_DB_PASSWORD=fake-not-real ./node_modules/.bin/tsx
  --conditions=react-server scripts/chat-migrate.ts` →
  `[chat:migrate] No SQL migrations found in .../lib/chat/migrations.`, exit 0
  (no database connection attempted).

Scope note: LC-WU-02 delivers the pool and migration infrastructure with unit
evidence only. No live MariaDB connection was made; the LC-PHASE-01 exit gates
(migrate from zero to current schema, backup restore, FK cascade/purge
verification) remain unverified and belong to LC-WU-03. The MariaDB DDL
implicit-commit limitation is documented in `lib/chat/migrations.ts`.

## Completed work unit — LC-WU-03

Deliverables:

- `lib/chat/migrations/001_chat_core.sql` — forward-only MariaDB core schema
  (InnoDB, `utf8mb4`, UTC `DATETIME(6)`, explicit internal `CHAR(36)` UUID keys).
  Tables: `chat_conversations`, `chat_messages`, `visitor_chat_sessions`,
  `chat_resume_tokens`, `operator_conversation_reads`,
  `operator_push_subscriptions`, `rate_limit_entries`, `chat_email_outbox`,
  `chat_metrics_events`, `chat_metrics_daily`, `chat_contact_consents`.
  No campaign/marketing-delivery tables.
- `lib/chat/purge.ts` — server-only, transactional `purgeChatConversation` plus
  the `createChatPurgeDatabase` mysql2 adapter. Deletes every conversation-bound
  table with bound parameters, then the conversation row; returns `void` and never
  inspects affected rows, so it is not an existence oracle.
- `lib/chat/purge.test.ts` — cascade-intent, parameterization, transaction,
  input-guard, failure-rollback and real-adapter tests through a mocked pool.
- `lib/chat/migrations.test.ts` — added static-schema tests reading the real
  `001_chat_core.sql` through the real splitter (tables, InnoDB/utf8mb4/
  `DATETIME(6)`, cascades, required indexes, unique hash/idempotency keys, consent
  independence, no metric PII, no partial indexes/procedures/`CHECK`).

Design facts:

- Conversation-bound tables carry `FOREIGN KEY ... ON DELETE CASCADE`; the purge
  service also deletes them explicitly as defense in depth.
- `chat_contact_consents` has **no** foreign key to conversations, so a lawful,
  independent consent is never deleted by a purge and consent is not treated as
  retained chat history.
- Metrics events are conversation-scoped only through the internal, never-exposed
  UUID (needed to prove cascade purge); daily aggregates hold counters only. No
  body, name, email, phone, token or push endpoint is stored in metrics.
- Session and resume-token secrets are stored only as ASCII SHA-256 hashes.
- Enum-like columns use `ENUM`; range/format validation is application-layer
  because MariaDB `CHECK` enforcement is version-dependent and the Hostinger
  version is unconfirmed.
- Only SQL the current splitter supports is used (proven by loading the file
  through `loadSqlDirectoryMigrations` in the tests).

Evidence (observed):

- RED: `./node_modules/.bin/vitest run lib/chat/purge.test.ts
  lib/chat/migrations.test.ts` → 2 failed (`Cannot find module
  '/lib/chat/purge'`; `Expected migration 001_chat_core to exist.`), 23 passed |
  11 skipped before the schema/service existed.
- GREEN: same command → 2 files passed, 51 tests passed.
- Regression check: `./node_modules/.bin/vitest run lib/chat` → 5 files passed,
  112 tests passed.
- Lint: `./node_modules/.bin/eslint lib/chat/purge.ts lib/chat/purge.test.ts
  lib/chat/migrations.test.ts` → 0 errors, 0 warnings.
- Typecheck: `./node_modules/.bin/tsc --noEmit` → no errors in the LC-WU-03
  files; the only errors are the pre-existing stale `.next` generated types for
  the removed `sse-probe` route (6 errors), unrelated to this work unit.

Scope note (Phase 1 exit gate remains OPEN): LC-WU-03 provides unit and
static-schema evidence only. No live MariaDB connection was made. A clean
database migrating from zero to current schema, a backup restore to a test
instance, and live FK cascade/purge verification on a database compatible with
Hostinger remain **unverified** and keep LC-PHASE-01 open. MariaDB DDL
implicit-commit non-atomicity is documented in the migration header and the
decision record.

## Completed work unit — LC-WU-04

Deliverables:

- `lib/chat/types.ts` — pure domain types and constants: conversation status,
  sender type, close-result and resume-purpose enums; documented field bounds
  (name 2–60, email ≤ 320, phone ≤ 32, body 1–1000, close note ≤ 500, cursor
  ≤ 512); request/response inputs and the single generic safe error envelope
  (`CHAT_GENERIC_ERROR_CODE = "chat_request_failed"`).
- `lib/chat/validation.ts` — Zod schemas for the visitor entry form, client
  message, operator reply and operator close (`.strict()` so unknown/identity
  fields are rejected; plain text only, control characters rejected; consent
  optional and defaulting to `false`), plus the opaque base64url `(created_at,
  id)` cursor codec (`encodeChatCursor` / `decodeChatCursor`, tolerant of any
  malformed input).
- `lib/chat/visitor-session.ts` — 256-bit `randomBytes` opaque secret; SHA-256
  database hash only; `v1.<secret>.<hmac>` HttpOnly/Secure/SameSite=Lax/Path=/
  cookie with bounded TTL and rotation-capable key-ring parsing
  (`CHAT_SESSION_SECRET`, comma-separated: first key signs, all keys verify);
  session scope resolved only from the database row; expiration/revocation
  verification; fail-closed on store errors; no conversation id and no secret in
  any error. mysql2 `VisitorSessionStore` adapter (parameterized only).
- `lib/chat/resume-token.ts` — independent 256-bit opaque token, SHA-256 hash
  persisted only, purpose/TTL restrictions (default 7 days), `?k=` link builder
  with a validated locale segment, a pure usability predicate, and an atomic
  `ResumeTokenStore.redeem` that claims the token once via a single conditional
  `UPDATE` (reuse/revoked/expired blocked), replaces the visitor session in the
  same transaction, and returns the identical `{ ok: false }` for reused,
  revoked, expired, purged or failed cases.
- `lib/chat/operator-auth.ts` — wraps the existing `requireAdminAuth`/admin
  session boundary; derives the operator identity only from server-side
  `ADMIN_EMAIL`; returns a generic non-enumerating error (preserving the boundary
  status) and builds the canonical operator message from server identity, never
  from request-supplied role/sender values.
- `env.unified.example` — names only: `CHAT_SESSION_SECRET` (rotation key ring),
  `CHAT_SESSION_TTL_SECONDS`, `CHAT_RESUME_TOKEN_TTL_SECONDS` (no values).

Evidence (observed):

- RED: `./node_modules/.bin/vitest run lib/chat/visitor-session.test.ts
  lib/chat/resume-token.test.ts lib/chat/operator-auth.test.ts` → 3 failed, no
  tests collected (`Cannot find module '/lib/chat/visitor-session'`,
  `'/lib/chat/resume-token'`, `'/lib/chat/operator-auth'`).
- GREEN: same command → 3 files passed, 97 tests passed.
- REFACTOR: removed a redundant `plainText` wrapper in `lib/chat/validation.ts`
  and added a cookie-value length bound plus one test; same command → 3 files
  passed, 98 tests passed.
- Regression: `./node_modules/.bin/vitest run lib/chat` → 8 files passed, 210
  tests passed. Full suite `./node_modules/.bin/vitest run` → 16 files passed,
  367 tests passed.
- Lint: `./node_modules/.bin/eslint lib/chat/types.ts lib/chat/validation.ts
  lib/chat/visitor-session.ts lib/chat/visitor-session.test.ts
  lib/chat/resume-token.ts lib/chat/resume-token.test.ts lib/chat/operator-auth.ts
  lib/chat/operator-auth.test.ts` → 0 errors, 0 warnings.
- Typecheck: `./node_modules/.bin/tsc --noEmit` → no errors in the LC-WU-04
  files; the only errors are the pre-existing stale `.next` generated types for
  the removed `sse-probe` route (6 errors), unrelated to this work unit.

Security behaviours covered by tests: cookie tampering (body and signature),
unknown-key/rotated-out rejection, rotation acceptance of a previous key,
malformed cookie tolerance, expiry and revocation, foreign-scope derivation from
the store (never the cookie), token reuse/revoked/expired/wrong-purpose
rejection, purged/absent-row generic failure, parameterized SQL (no interpolation
of the hash), schema field bounds, plain-text enforcement, and operator
identity/role spoofing rejection.

Scope note (Phase 2 exit gate remains OPEN): LC-WU-04 provides pure security
helpers, typed DB contracts and mysql2 adapters exercised through mocked pools.
No API route and no live MariaDB integration was built or run, so the
`LC-PHASE-02` acceptance criteria (live reachability, authorization tests against
a real database, rate-limit exhaustion) remain **unverified** and belong to
LC-WU-05. The **LC-PHASE-01** real-MariaDB gap (clean migrate-from-zero, backup
restore, live FK cascade/purge) also remains open and unchanged.

## Completed work unit — LC-WU-05

Deliverables:

- `app/api/chat/visitor/conversations/route.ts` (+ `route.test.ts`) — visitor
  conversation entry: `POST` validates the entry form, rate-limits opens (5 per
  fixed window keyed by a hashed trusted request key), creates the conversation
  and its server session atomically, sets the hardened HttpOnly session cookie and
  returns a safe conversation view; `GET` reads only the conversation bound to the
  presented session.
- `app/api/chat/visitor/messages/route.ts` (+ `route.test.ts`) — authorized send:
  resolves the session, rate-limits sends (5 per fixed window keyed by the hashed
  conversation scope), validates the client message, stamps sender identity
  server-side from the stored conversation, and persists idempotently on
  `(conversation_id, client_message_id)`.
- `app/api/chat/visitor/history/route.ts` (+ `route.test.ts`) — authorized
  current-conversation history with an opaque composite `(created_at, id)` cursor
  (newest-first), a bounded page size and a `nextCursor` only on a full page.
- `lib/chat/rate-limit.ts` (+ `rate-limit.test.ts`) — fixed-window MariaDB limiter:
  epoch-derived UTC window start, SHA-256 action-scoped key hash, a pure decision
  function, and a single-statement atomic `INSERT ... ON DUPLICATE KEY UPDATE`
  counter using `LAST_INSERT_ID` (bound parameters only).
- `lib/chat/http.ts` (+ `http.test.ts`) — strict origin allowlist with no silent
  production fallback, `Cache-Control: no-store`/JSON responses, one generic error
  envelope, a bounded JSON reader (media type + byte cap), cookie parsing, trusted
  request-key extraction, session resolution and bounded (fixed-code) logging.
- `lib/chat/conversations.ts` (+ `conversations.test.ts`) — parameterized visitor
  DAL: atomic conversation+session creation, session-scoped conversation/message
  reads, composite-cursor pagination, transactional insert that also touches
  `last_message_at`, duplicate-key detection and the idempotent persistence
  service; safe view serializers that never expose the internal conversation id.
- `docs/chat/phase0-decision-record.md` — section 13 records the API contract
  decisions and the honest limitations.

Design facts:

- Feature gating is first: while `CHAT_ENABLED` is not the literal `"true"`, every
  route returns the same generic disabled response (`404`, no-store) and performs
  no origin check, rate-limit, session or database work.
- The origin allowlist is exact-match `ALLOWED_ORIGINS`; an empty or missing
  allowlist rejects every origin, including `https://mascercaap.com`. There is no
  hardcoded production fallback.
- No route ever returns or logs the internal conversation UUID, a session secret
  or a resume token. Message views expose only `id`, `senderType`, `body` and
  `createdAt`; logging emits a fixed event code only.
- Rate-limit keys are stored only as an ASCII SHA-256 hash; the counter increment
  is a single atomic statement so two concurrent requests cannot both read the
  same count and both pass.

Evidence (observed):

- RED: `./node_modules/.bin/vitest run lib/chat/http.test.ts
  lib/chat/rate-limit.test.ts lib/chat/conversations.test.ts
  app/api/chat/visitor/conversations/route.test.ts
  app/api/chat/visitor/messages/route.test.ts
  app/api/chat/visitor/history/route.test.ts` → 6 failed, 27 tests failed before
  the modules existed (`Cannot find module '/lib/chat/http'`,
  `'/lib/chat/rate-limit'`, `'/lib/chat/conversations'`,
  `'/app/api/chat/visitor/.../route'`).
- GREEN: same command → 6 files passed, 77 tests passed.
- REFACTOR: extracted the shared bounded-body error mapping into
  `chatBoundedBodyErrorResponse` in `lib/chat/http.ts`; re-ran the scope command →
  6 files passed, 77 tests passed.
- Regression: `./node_modules/.bin/vitest run lib/chat app/api/chat` → 14 files
  passed, 287 tests passed. Full suite `./node_modules/.bin/vitest run` → 22 files
  passed, 445 tests passed (was 367 before this unit).
- Lint: `./node_modules/.bin/eslint` on the six new source files and six new test
  files → 0 errors, 0 warnings.
- Typecheck: `./node_modules/.bin/tsc --noEmit` → no errors in the LC-WU-05 files;
  the only errors are the pre-existing stale `.next` generated types for the
  removed `sse-probe` route (6 errors), unrelated to this work unit.

Scope note (Phase 2 exit gate remains OPEN): LC-WU-05 provides route-contract and
unit evidence only, with database access exercised through mocked pools. **No live
MariaDB connection was made and no live integration is claimed.** The
`LC-PHASE-02` acceptance criteria that require a real database — all mutation/read
paths reachable only by their valid role/session against a live DB, token/session
revocation demonstrated end-to-end, and rate-limit exhaustion observed on real
rows — remain **unverified**. The **LC-PHASE-01** real-MariaDB gap (clean
migrate-from-zero, backup restore, live FK cascade/purge) also remains open and is
unchanged by this unit. Commercial consent persistence is deliberately out of
scope here (validated only) and belongs to LC-WU-11. Reopening a closed
conversation on new visitor activity is not yet implemented; the route accepts the
send and updates `last_message_at` regardless of status, and that domain rule
stays in a later unit.

## Completed work unit — LC-WU-06

Deliverables:

- `lib/help-hub-context.tsx`, `components/ui/HelpDrawer.tsx`,
  `components/ui/drawer-views/HelpMenu.tsx` — the `chat` view added to all three
  duplicated `View` unions; the drawer renders the chat view, titles it, and
  excludes it from session persistence.
- `components/ui/drawer-views/ChatView.tsx` (+ `ChatView.test.tsx`) — accessible,
  localized visitor chat: entry form (name/email required, phone optional,
  required service-purpose copy, separate unchecked marketing opt-in), thread
  with plain-text rendering, character counter, Enter-to-send / Shift+Enter
  newline with IME guard, focus management, `role="log"`/`role="status"`/
  `role="alert"` announcements, optimistic send reconciled by client message
  UUID, retry of failed sends with the same idempotency key, and
  closed/offline/error/waiting/unavailable states.
- `app/[lang]/chat/page.tsx` + `app/[lang]/chat/ChatResumeClient.tsx`
  (+ `ChatResumeClient.test.tsx`) — `/[lang]/chat` resume route: reads the opaque
  `?k=` token, redeems it through a Server Action using the existing single-use
  `ResumeTokenStore.redeem` contract, sets the hardened session cookie
  server-side, and renders one generic non-enumerating error for
  invalid/expired/revoked/purged/missing tokens.
- `messages/es.json`, `messages/en.json` — `helpHub.menu.chat`, a `helpHub.chat`
  and `helpHub.resume` copy block, and `metadata.chat`; ES/EN parity holds.

Design facts:

- No `localStorage`/`sessionStorage`, conversation id, session secret, resume
  token or PII is written by the visitor UI; the token lives only in component
  state and is removed from the address bar after redemption.
- Message bodies render as text nodes (React escaping); no
  `dangerouslySetInnerHTML`.
- Reads and writes use only the authorized visitor APIs with
  `credentials: "same-origin"` and `cache: "no-store"`.
- `CHAT_ENABLED` still gates the module server-side; while it is off the UI shows
  the honest unavailable state. No flag value reaches the browser.
- The menu WhatsApp entry is replaced by "Contact an advisor"; floating and
  catalog WhatsApp (`AnimatedWhatsAppButton`, FAQ connect flow) are untouched,
  and the `whatsapp` drawer view remains reachable from FAQ.

Evidence (observed):

- RED: `./node_modules/.bin/vitest run
  "components/ui/drawer-views/ChatView.test.tsx"
  "app/[lang]/chat/ChatResumeClient.test.tsx"` → 2 failed suites, no tests
  collected (`Cannot find module './ChatView'`, `'./ChatResumeClient'`).
- GREEN: same command → 2 files passed, 20 tests passed.
- REFACTOR: wired the localized validation copy (`t.nameError`/`t.emailError`/
  `t.phoneError`) into the entry form, removing three new i18n orphan keys; added
  `ChatNotice` offline/unavailable/error tests → same command → 2 files passed,
  23 tests passed.
- Regression: `./node_modules/.bin/vitest run
  "components/ui/drawer-views/ChatView.test.tsx"
  "app/[lang]/chat/ChatResumeClient.test.tsx" lib/chat app/api/chat` → 16 files
  passed, 310 tests passed.
- Lint: `./node_modules/.bin/eslint lib/help-hub-context.tsx
  components/ui/HelpDrawer.tsx components/ui/drawer-views/HelpMenu.tsx
  components/ui/drawer-views/ChatView.tsx
  components/ui/drawer-views/ChatView.test.tsx app/[lang]/chat/page.tsx
  app/[lang]/chat/ChatResumeClient.tsx
  app/[lang]/chat/ChatResumeClient.test.tsx` → 0 errors, 0 warnings.
- Typecheck: `./node_modules/.bin/tsc --noEmit` → no errors in the LC-WU-06
  files; the only errors are the pre-existing stale `.next` generated types for
  the removed `sse-probe` route (6 errors), unrelated to this unit.
- i18n: `npm run i18n:validate` → "Perfect parity" and the same 5 pre-existing
  `contact.form.availabilityAssistant.*` orphan keys; LC-WU-06 adds no new
  orphans.
- Blocker fix (visitor `GET` Origin policy): RED: `./node_modules/.bin/vitest run
  lib/chat/http.test.ts app/api/chat/visitor/conversations/route.test.ts
  app/api/chat/visitor/history/route.test.ts` → 4 failed, 43 passed (an absent
  `Origin` on the authorized visitor `GET` still returned `403`). GREEN: same
  command → 3 files passed, 47 tests passed. The new
  `ChatOriginCheckOptions.allowAbsentOrigin` policy accepts an absent `Origin`
  only for authenticated safe reads, still accepts an explicit allowlisted
  origin, still rejects an explicit foreign origin with the generic `403`, and
  keeps the strict default (absent `Origin` rejected) for state-changing
  callers. Regression: `./node_modules/.bin/vitest run lib/chat app/api/chat`
  → 14 files passed, 294 tests passed. Lint: `./node_modules/.bin/eslint` over
  `lib/chat/http.ts`, `lib/chat/http.test.ts`,
  `app/api/chat/visitor/conversations/route.ts`,
  `app/api/chat/visitor/conversations/route.test.ts`,
  `app/api/chat/visitor/history/route.ts`,
  `app/api/chat/visitor/history/route.test.ts` → exit 0. Typecheck:
  `./node_modules/.bin/tsc --noEmit` → only the 6 pre-existing stale `.next`
  `sse-probe` errors; none in the touched files.

Interaction-test note: the repository runs Vitest in the `node` environment with
no DOM library installed (`jsdom`/`@testing-library` are absent) and this unit
performs no installs. Keyboard, validation, reconciliation, idempotency and
resume semantics are therefore covered through exported pure helpers plus
`react-dom/server` static markup for the presentational components. Real
browser-level keyboard/focus/mobile verification remains part of LC-WU-13.

Scope note (Phase 3 exit gate remains OPEN): LC-WU-06 delivers the visitor UI and
resume route with component/unit evidence only. **No live MariaDB connection was
made and no live integration is claimed.** The same-origin visitor `GET` Origin
risk is resolved: the visitor `GET` routes
(`/api/chat/visitor/conversations`, `/api/chat/visitor/history`) now use the
documented `allowAbsentOrigin` read policy on `assertChatRequestOrigin`, so an
absent `Origin` (as browsers send on same-origin `GET`) is accepted while an
explicitly present disallowed origin is still rejected with `403`; the
state-changing `POST` routes keep the strict allowlist unchanged. The
`LC-PHASE-02` real-database gap and the `LC-PHASE-01` real-MariaDB gap remain
open and unchanged by this unit.

## Completed work unit — LC-WU-07

Deliverables:

- `lib/chat/operator-conversations.ts` (+ `.test.ts`) — server-only coordinator
  inbox DAL: paginated conversation list ordered by
  `COALESCE(last_message_at, created_at) DESC, id DESC` with an opaque composite
  `(activity_at, id)` cursor and an optional status filter; derived per-operator
  unread count (non-operator messages after the read cursor, never a mutable
  column); support detail read; a lone transaction that assigns (open → assigned)
  and inserts an operator reply; an atomic, monotonic mark-read upsert; a
  conditional close; and the opaque conversation-handle codec.
- `app/api/chat/operator/conversations/route.ts` (+ `.test.ts`) — authorized inbox
  list (`GET`), same-origin safe-read Origin policy, `no-store`, generic errors.
- `app/api/chat/operator/messages/route.ts` (+ `.test.ts`) — thread history
  (`GET`) with the composite `(created_at, id)` cursor and operator reply
  (`POST`) limited to 1–1000 characters with server-derived sender identity.
- `app/api/chat/operator/reads/route.ts` (+ `.test.ts`) — per-operator read
  cursor update; constant, non-enumerating response.
- `app/api/chat/operator/close/route.ts` (+ `.test.ts`) — mandatory classification
  from the exact approved set and close-and-purge with an explicit destructive
  confirmation; purge runs through the existing `purgeChatConversation` service
  and returns a constant non-enumerating result.
- `app/(admin)/admin/inbox/page.tsx`, `InboxClient.tsx` (+ `InboxClient.test.tsx`)
  — protected inbox under the existing admin/MFA session gate with safe loading,
  empty, retry, access-denied and sign-out states, reply composer, close controls
  and the destructive-confirmation flow.
- `components/admin/AdminNavbar.tsx` — "Bandeja de chat" entry under Operaciones.

Design facts:

- The inbox reuses `requireAdminAuth` through `requireOperatorAuth`; no route
  accepts a client role, sender identity or operator id. Every operator response
  is re-wrapped as `no-store` with the single generic error envelope, including
  the preserved admin-boundary status.
- The raw internal conversation UUID is never returned; the client only receives
  an opaque handle (`encodeConversationHandle`, reusing the tested cursor codec)
  and the internal id is never logged.
- Unread is derived from `operator_conversation_reads.last_read_at`; mark-read is
  one atomic upsert whose new value is the conversation's current activity
  boundary guarded by `GREATEST`, so concurrent mark-reads cannot regress the
  cursor. Only non-operator (`visitor`/`bot`) messages count as unread.
- Close uses `WHERE id = ? AND status <> 'closed'`, so concurrent close attempts
  cannot double-classify: the first writer wins and every caller reads the same
  final row. Purge is a single transactional call that resolves identically
  whether or not the row existed.
- Reply assignment runs in the same transaction as the message insert, so a
  failed insert never leaves a half-assigned conversation; idempotency on
  `(conversation_id, client_message_id)` is reconciled exactly like the visitor
  path.

Evidence (observed):

- RED: `./node_modules/.bin/vitest run lib/chat/operator-conversations.test.ts
  app/api/chat/operator/conversations/route.test.ts
  app/api/chat/operator/messages/route.test.ts
  app/api/chat/operator/reads/route.test.ts
  app/api/chat/operator/close/route.test.ts
  "app/(admin)/admin/inbox/InboxClient.test.tsx"` → 6 failed files, 9 tests failed
  (`Cannot find module '/lib/chat/operator-conversations'` and
  `'/app/api/chat/operator/.../route'`).
- GREEN: same command → 6 files passed, 73 tests passed.
- REFACTOR: extracted the decoded-cursor date guard (`isUsableCursorDate`) into
  `lib/chat/operator-conversations.ts` and reused it in the list and thread routes
  instead of two local copies; added a unit test for the guard. Same command →
  6 files passed, 74 tests passed.
- Regression: `./node_modules/.bin/vitest run lib/chat app/api/chat
  "app/(admin)/admin/inbox"` → 20 files passed, 367 tests passed. Full suite
  `./node_modules/.bin/vitest run` → 30 files passed, 549 tests passed (was 548
  before the refactor test).
- Lint: `./node_modules/.bin/eslint` over the ten new source/test files plus
  `components/admin/AdminNavbar.tsx` → 0 errors, 0 warnings.
- Typecheck: `./node_modules/.bin/tsc --noEmit` → no errors in the LC-WU-07 files;
  the only errors are the pre-existing stale `.next` generated types for the
  removed `sse-probe` route (6 errors), unrelated to this work unit.

Security behaviours covered by tests: feature-gate disabled response, strict
Origin rejection for state-changing routes, absent-Origin tolerance for
authorized safe reads, preserved admin-boundary status mapped to the generic
no-store envelope, malformed cursor/handle/status rejection, status spoofing and
identity/role field rejection on reply and close payloads, mandatory approved
close classification, destructive-purge confirmation requirement, purge-service
invocation with a constant non-enumerating response, idempotent reply
reconciliation, closed-conversation reply refusal, and the derived unread /
read-cursor contract.

Scope note (Phase 4 exit gate remains OPEN): LC-WU-07 provides route-contract and
unit evidence only, with database access exercised through mocked pools. **No
live MariaDB connection was made and no live integration is claimed.** The
`LC-PHASE-04` acceptance criteria that require a real database — a coordinator
managing a real conversation end-to-end, irreversible purge observed in the
operational database, and unread/close/purge race conditions observed on real
rows — remain **unverified**. The **LC-PHASE-01** real-MariaDB gap (clean
migrate-from-zero, backup restore, live FK cascade/purge) and the **LC-PHASE-02**
real-database authorization gap also remain open and are unchanged by this unit.
Real-time wake-up signals for the inbox (SSE/polling) are out of scope here and
belong to LC-WU-08; the inbox currently refetches only on user action. Metrics
events on close/purge are deliberately not written (LC-WU-12).

## Completed work unit — LC-WU-08

Deliverables:

- `lib/chat/realtime.ts` (+ `realtime.test.ts`) — server-only in-process SSE
  signal hub: an opaque `conversation_changed` framing, a process-wide
  subscription registry with conversation-scoped and coordinator fan-out, a
  `retry:` preamble, comment-only heartbeats, a bounded maximum stream duration,
  abort/cancel cleanup, per-key/total connection caps, SHA-256 connection keys,
  PII-free metrics, and the `buildChatSseResponse` lifecycle. `publish` is
  documented (and asserted) to run only after the related database transaction
  commits; the wire event never carries an id, body, name, email, phone or token.
- `app/api/chat/visitor/stream/route.ts` (+ `route.test.ts`) — authenticated
  visitor stream: `CHAT_ENABLED` gate, safe-read origin policy (an absent `Origin`
  is tolerated, an explicit foreign origin is `403`), session resolution from the
  signed cookie only, per-session/IP caps, `no-store`/`no-transform`/
  `X-Accel-Buffering: no` headers, and a bounded `429` when caps are exhausted.
- `app/api/chat/operator/stream/route.ts` (+ `route.test.ts`) — coordinator
  stream on the shared operator channel behind the existing admin/MFA boundary,
  with the preserved boundary status wrapped in the generic no-store envelope and
  the same caps/headers.
- `components/ui/drawer-views/ChatView.tsx` (+ test) — visitor `EventSource`
  reconnect with bounded exponential backoff, immediate authorized refetch on
  every opaque wake-up, and visible-page fallback polling only while SSE is
  unavailable, plus a reconcile-on-visible refetch.
- `app/(admin)/admin/inbox/InboxClient.tsx` (+ test) — coordinator
  `EventSource` reconnect with bounded backoff, silent list+open-thread refetch on
  every wake-up, visible-page 15 s fallback polling while SSE is down, and a 30 s
  recovery refetch even while SSE is healthy.
- `odd/tasks/live-chat-implementation.md` — this section.

Design facts:

- **Opaque signals only.** Internally the hub routes by a raw conversation id or
  the `operator-chat` scope, but `formatChatSseChanged()` is the only changed
  frame and serializes neither: `event: conversation_changed\ndata:\n\n`. The
  explicit empty `data` line is required for browsers to dispatch the named event
  while keeping the payload empty.
- **No fabrication of change.** A fresh stream emits only the `retry:` preamble
  and heartbeats; `conversation_changed` appears only after a `publish`, which the
  hub contract requires after the database commit. An open socket is never treated
  as delivery: every wake-up (or reconnect/recovery) re-reads authorized state.
- **Bounded by construction.** Per-session (3) and per-IP (20) caps plus a
  process total (200), a 20 s heartbeat, and a 120 s maximum stream duration keep
  listeners from leaking; the route's platform ceiling (150 s) sits above the
  graceful close so the stream always ends on our terms and `EventSource`
  reconnects deliberately.
- **Fail-closed and non-enumerating.** Disabled, foreign-origin, unauthenticated
  and cap-exhausted streams return the shared generic envelopes (`404`/`403`/
  `401`/`429`), never a resource identity.
- **PII-free observability.** Connection keys and the trusted request key reach
  the hub only as SHA-256 hex; metrics are counters (open, opened, closed,
  rejected, publishes, heartbeats, expirations) with no identity or content.
- **Restart behavior.** The hub is in-process only: on restart every stream
  drops, every `EventSource` reconnects with backoff, and clients re-fetch
  authorized state.

Evidence (observed):

- RED (module): `./node_modules/.bin/vitest run lib/chat/realtime.test.ts` with
  `lib/chat/realtime.ts` absent → 1 failed suite, no tests collected (`Cannot
  find module '/lib/chat/realtime'`).
- RED (routes): `./node_modules/.bin/vitest run
  app/api/chat/visitor/stream/route.test.ts
  app/api/chat/operator/stream/route.test.ts` with both `route.ts` files absent →
  2 failed suites, 14 tests failed (`Cannot find module
  '/app/api/chat/visitor/stream/route'` and `.../operator/stream/route'`).
- GREEN: with the module and both routes present, `./node_modules/.bin/vitest run
  lib/chat/realtime.test.ts app/api/chat/visitor/stream/route.test.ts
  app/api/chat/operator/stream/route.test.ts` → 3 files passed, 27 tests passed.
- Client helpers: `./node_modules/.bin/vitest run
  "components/ui/drawer-views/ChatView.test.tsx"
  "app/(admin)/admin/inbox/InboxClient.test.tsx"` → 2 files passed, 36 tests
  passed (includes the new reconnect/fallback helper cases).
- Regression: `./node_modules/.bin/vitest run lib/chat app/api/chat
  "components/ui/drawer-views/ChatView.test.tsx" "app/(admin)/admin/inbox"` →
  24 files passed, 419 tests passed. Full suite `./node_modules/.bin/vitest run`
  → 33 files passed, 581 tests passed (was 549 before this unit; +32).
- Lint: `./node_modules/.bin/eslint` over the three new source files, the three
  new test files, and the four edited client/test files → 0 errors, 0 warnings.
- Typecheck: `./node_modules/.bin/tsc --noEmit` → no errors in the LC-WU-08 files;
  the only errors are the pre-existing stale `.next` generated types for the
  removed `sse-probe` route (6 errors), unrelated to this work unit.

Scope note (Phase 5 exit gate remains OPEN): LC-WU-08 delivers the transport
plumbing, caps, cleanup, opaque framing and metrics with unit/route-contract
evidence only. **The Hostinger production spike (proxy buffering, 120 s
connection stability, concurrent streams, restart, fallback paths) was NOT
performed and is not claimed**; it belongs to LC-WU-13. Two integrations are
deliberately deferred because they fall outside this unit's file scope:

- **Publish wiring.** `publishConversationChanged` is the post-commit entry point,
  but the visitor/operator message and close/read routes are not in this unit's
  allowed file set, so they do not yet call it. Until wired, the stream only emits
  heartbeats after connect; the hub contract and opacity are fully tested, and
  wiring the post-commit calls is the remaining step.
- **Metrics export.** The hub exposes `metrics()` (open/closed/rejected/publish/
  heartbeat/expiration counters) for a future operations surface; no metrics
  route/dashboard is built here, and the client-side refetch-failure counter has
  no reporting endpoint yet (LC-WU-12).
- **Visitor incremental fetch.** The visitor history API paginates newest-first
  with the composite `(created_at, id)` cursor for *older* pages; it has no
  forward `after` cursor. The visitor fallback therefore refetches a bounded
  newest page and reconciles by id + composite ordering (never full history) and
  triggers an immediate refetch on every wake-up; a strictly forward incremental
  fetch needs an `after` cursor added to the history route in a later unit.

The **LC-PHASE-01** real-MariaDB gap (clean migrate-from-zero, backup restore,
live FK cascade/purge), the **LC-PHASE-02** real-database authorization gap, and
the **LC-PHASE-04** real-database coordinator gap all remain open and unchanged
by this unit.

## Completed work unit — LC-WU-09

Deliverables (observed 2026-10-10, uncommitted working tree):

- `lib/chat/push.ts` + `push.test.ts` — aggregate-only payload builder, VAPID ES256 JWT, subscription DAL, fan-out with verified-removal-only, RFC 8291 encryption.
- `lib/chat/email-outbox.ts` + `email-outbox.test.ts` — idempotent enqueue, exponential backoff, atomic batch claim, Resend sender, resume-URL minter.
- `lib/chat/notify.ts` + `notify.test.ts` — visitor-presence lease check (fail-closed), publish-first orchestrators that never throw.
- `app/api/chat/operator/push-subscriptions/route.ts` + test; `app/api/chat/internal/email-worker/route.ts` + test.
- Post-commit publish + notify wiring in visitor/operator message and close routes; inbox opt-in/out UI with Badging API.
- `env.unified.example` VAPID/internal-secret names only; `docs/chat/phase0-decision-record.md` section 14.

Evidence (worker-reported, not re-run by parent yet):

- Targeted suite → 5 files passed, 79 tests passed.
- Regression `vitest run lib/chat app/api/chat` → 27 files passed, 462 tests passed.
- ESLint clean; `tsc --noEmit` clean except 6 pre-existing stale `.next/` sse-probe errors.

Scope note (Phase 6 exit gate remains OPEN): contract-tested against mocked transports/pools/fetch only. No live MariaDB, real push service, or Resend delivery verified. Scheduler invocation for the email-worker endpoint and VAPID keypair/service-worker deployment belong to LC-WU-13/hosting setup.

## Completed work unit — LC-WU-10

Deliverables (observed 2026-10-10, uncommitted working tree):

- `lib/chat/bot-catalog.ts` + `bot-catalog.test.ts` — versioned frozen catalog, 12 approved intents, provisional `precios`/`despachos`/`horario` texts verbatim from criteria §7.
- `lib/chat/bot.ts` + `bot.test.ts` — pure classifier (normalization, weighted keywords, threshold 0.7, multi-intent/complaint/post-sale/order-status/human/unknown → handoff).
- Visitor message POST D6-gated post-commit bot block (best-effort; bot failure never fails visitor send); bot reply via idempotent persist path; handoff writes no bot message.
- `docs/chat/phase0-decision-record.md` section 15 (D6 blocker + provisional status).
- Ratified: `app/api/chat/visitor/messages/route.test.ts` edited for route wiring (required by verification; accepted as in-scope test update).

Evidence (worker-reported): focused suite 3 files / 48 tests passed; regression 29 files / 501 tests passed; ESLint clean; tsc clean except 6 pre-existing stale `.next/` sse-probe errors.

Scope note (Phase 7 exit gate remains OPEN for production): D6 official texts pending; contract evidence only (mocked pools, no live MariaDB). Bot stays behind `CHAT_BOT_ENABLED`.

## Completed work unit — LC-WU-11

Deliverables (observed 2026-10-10, uncommitted working tree):

- `lib/chat/retention.ts` + `retention.test.ts` — closed-only selector, bounded batch, dry-run, counts-only log, single-claim via purge-transaction guard.
- `lib/chat/consent.ts` + `consent.test.ts` — capture/revoke/eligibility DAL, versioned text, no-consent default, purge independence.
- `app/api/chat/internal/retention-cleanup/route.ts` + test — internal-secret-or-admin auth, `CHAT_RETENTION_ENABLED` kill switch, required `?olderThanDays`, clamped `?limit`, `?dryRun=1`.
- Visitor POST best-effort consent wiring; `docs/chat/data-subject-procedures.md` + decision-record section 16.

Evidence (worker-reported): focused 4 files / 82 tests passed; regression 32 files / 570 tests passed; ESLint clean; `tsc --noEmit` exit 1 only on 6 pre-existing stale `.next/types` sse-probe errors (0 in unit files).

Scope note: automation stays disabled until D1/D2/D4/D5; retention window is a runtime param, no default ships. Contract evidence only (no live MariaDB/scheduler/restore rehearsal).

## Completed work unit — LC-WU-12

Deliverables (observed 2026-10-10, uncommitted working tree):

- `lib/chat/metrics.ts` + `metrics.test.ts` — UTC event builders, range/granularity/SLA parsing, aggregator, alert detectors, capped report store.
- `GET /api/chat/operator/metrics` + test — operator-auth + CHAT_ENABLED + origin + no-store; `slaMinutes` absent → `slaCompliance: null` + `slaPending: true` (D3 stays open).
- Inbox `Bandeja`/`Métricas` tab rendering aggregates only; retention opt-in metric sink; decision-record section 17.

Evidence (worker-reported): targeted 51/51 passed; regression 35 files / 636 passed; ESLint clean; tsc only 6 pre-existing `.next` sse-probe errors.

Scope note: consent/close/created/first-response event emission call sites partially unwired (documented gaps for LC-WU-13); contract evidence only, no live MariaDB.

## Completed work unit — LC-WU-13

Deliverables (observed 2026-10-10, uncommitted working tree):

- `docs/chat/production-runbook.md` + `docs/chat/security-review.md` (21-row matrix, 0 critical / 1 high / 1 medium / 1 info) + decision-record section 18.
- Metric wiring completions: `conversation_created` (conversations.ts), `consent_granted` (consent.ts optional sink), `conversation_closed` + `outcome_classified` (operator close route), `cleanup_runs`/`conversations_purged` (retention-cleanup route).
- Parent ratification: one-line test fix in `retention-cleanup/route.test.ts` (expected keys + `metrics`) — restores green.

Evidence (parent-observed): full `vitest run` → 45 files / 819 passed; ESLint on chat surfaces → exit 0; `tsc --noEmit` → only 6 pre-existing stale `.next` sse-probe errors; `i18n:validate` → perfect es/en parity (fails only on 5 pre-existing orphan contact keys).

Scope note: NO live Hostinger probe, MariaDB connection, push/Resend delivery, migration/rollback execution, or secret retrieval performed. D1–D6 remain open; all `CHAT_*` flags ship disabled. Production enablement requires staging authorization.

## Commit policy

Git commits, pushes, deployments, and every remote operation are deferred by
explicit user instruction. This feature is developed locally on
`feat/live-chat-implementation`; work-unit completion is marked on observed local
evidence only. No project source code or configuration is committed by this
effort.

## Definition of completion

The implementation is complete only when all LC-PHASE-10 acceptance criteria and
the applicable `Criterios-Chat.md` Definition of Done items are evidenced, every
enabled capability has an approved decision-gate value, and migration, backup
restore, purge, retention cleanup, notification failures, and feature-flag
rollback have been rehearsed.
