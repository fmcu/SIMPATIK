# agents.md — SIMPATIK MVP

This file defines the working rules for coding agents in the SIMPATIK repository.

## 1. Project Mission

Build the 0–2 month MVP of SIMPATIK: an internal website for 12 UPT to prepare and submit compliance reports, for Kanwil to review them, for the Product Owner to approve them, and for leadership to monitor reporting through a basic dashboard and CSV recap.

Keep the MVP narrow. Deliver the reporting workflow end-to-end before considering deferred features.

## 2. Source of Truth

Read these files before changing implementation:

1. `prd.md` — product scope, roles, business rules, and acceptance criteria.
2. `architecture.md` — system boundaries, module structure, API, data, auth, security, and deployment.
3. `tasks.md` — implementation sequence and release checklist.
4. `agents.md` — engineering behavior and repository rules.

When documents conflict:

- Product behavior follows `prd.md`.
- Technical structure follows `architecture.md`.
- Work order follows `tasks.md`.
- Do not silently choose a materially different behavior. Report the conflict and update the relevant document when authorized.

Do not mark a task complete unless its implementation and relevant tests are complete.

## 3. MVP Scope

### Included

- Authentication and database sessions.
- Seven roles and UPT-scoped authorization.
- User, UPT, period, indicator, and required-document administration.
- Report draft, validation, submission, review, revision, final approval, and history.
- Private supporting-document upload and download.
- Basic dashboard, filters, drill-down, and CSV recap.
- Business audit log, technical logging, health checks, backup, UAT, documentation, and pilot release.

### Deferred

Do not implement these unless the user explicitly changes the scope:

- Public complaint intake.
- Complete complaint, gratification, or disciplinary modules.
- Automatic risk scoring.
- Email, WhatsApp, or push notifications.
- WBS, personnel, Srikandi, or other external integrations.
- Mobile applications.
- Microservices, message brokers, Kubernetes, or multi-region infrastructure.
- Large historical-data migration.
- Advanced analytics.

## 4. Fixed Technology Stack

- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend:** Express.js 5, TypeScript, ESM.
- **Authentication:** Better Auth mounted in Express.
- **ORM:** Prisma.
- **Database:** PostgreSQL.
- **Files:** private storage through a backend storage adapter.
- **Architecture:** monorepo; separate frontend and backend applications; Express modular monolith.

Do not replace a fixed technology without explicit approval.

The request path is:

```text
Browser
  → Next.js frontend
  → Express.js API
  → Prisma
  → PostgreSQL
```

Better Auth and file storage are owned by the Express backend. Next.js must not connect directly to PostgreSQL.

## 5. Expected Repository Layout

```text
simpatik/
├── frontend/
│   └── src/
│       ├── app/
│       ├── components/
│       │   ├── ui/
│       │   └── shared/
│       ├── features/
│       ├── lib/
│       └── styles/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── modules/
│   │   ├── services/
│   │   ├── app.ts
│   │   └── server.ts
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
├── packages/
│   └── contracts/
├── prd.md
├── architecture.md
├── tasks.md
└── agents.md
```

Preserve existing repository conventions when the real tree differs. Do not perform a broad restructure as part of an unrelated feature.

## 6. Package Manager and Commands

- Use the package manager identified by the existing lockfile.
- Never introduce a second lockfile or package manager.
- Prefer repository scripts over invoking tools with ad hoc options.
- Before handoff, run the available equivalents of:
  - lint
  - type-check
  - unit tests
  - integration tests for changed backend behavior
  - relevant E2E tests
  - production build
- If a standard script is missing, add it only when the change is in scope and document it.
- Do not claim a check passed if it was not executed.

## 7. Seven Roles

Use these canonical enum values:

```ts
type Role =
  | "PIMPINAN"
  | "PRODUCT_OWNER"
  | "PETUGAS_KANWIL"
  | "KOORDINATOR_UPT"
  | "PETUGAS_UPT"
  | "ADMIN_SIMPATIK"
  | "SYSTEM_ADMIN";
```

### Responsibility summary

| Role | Responsibility |
|---|---|
| PIMPINAN | Read-only dashboard, permitted detail, and recap |
| PRODUCT_OWNER | Business-rule/indicator approval and final report approval |
| PETUGAS_KANWIL | Review, comment, request revision, and mark report REVIEWED |
| KOORDINATOR_UPT | Validate and submit reports for the assigned UPT |
| PETUGAS_UPT | Create/edit drafts, upload evidence, and address revisions |
| ADMIN_SIMPATIK | Manage accounts, roles, UPT, periods, and operational configuration |
| SYSTEM_ADMIN | Deployment, technical configuration, backup, health checks, and technical logs |

### Authorization invariants

- Every protected backend route checks the session and role.
- Every UPT-owned query enforces UPT scope in the backend.
- Never trust `uptId` from the client without deriving or validating it against the session.
- `PETUGAS_UPT` and `KOORDINATOR_UPT` require an assigned `uptId`.
- `SYSTEM_ADMIN` has no report-substance access by default.
- `ADMIN_SIMPATIK` is not automatically a business approver.
- `PETUGAS_KANWIL` cannot perform final approval.
- `PRODUCT_OWNER` can approve only a report in `REVIEWED`.
- UI permission gates improve UX but never replace backend authorization.
- Add negative authorization tests for every denied matrix entry affected by a change.

## 8. Report Workflow

Canonical statuses:

```ts
type ReportStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "REVISION_REQUIRED"
  | "REVIEWED"
  | "APPROVED";
```

Canonical flow:

```text
DRAFT → SUBMITTED → REVIEWED → APPROVED
             ↓
      REVISION_REQUIRED → SUBMITTED
```

Rules:

- `PETUGAS_UPT` edits `DRAFT` and `REVISION_REQUIRED`.
- `KOORDINATOR_UPT` validates and submits a report from the same UPT.
- `PETUGAS_KANWIL` requests revision or moves `SUBMITTED` to `REVIEWED`.
- A revision request requires a note.
- `PRODUCT_OWNER` moves `REVIEWED` to `APPROVED`.
- `SUBMITTED`, `REVIEWED`, and `APPROVED` report content is locked.
- Every transition records actor, source status, target status, time, and note when applicable.
- Update the report, status history, and audit log in one Prisma transaction.
- Do not add new statuses without updating PRD, Architecture, API tests, UI badges, filters, and the task plan.

## 9. Frontend Rules

### Next.js boundary

- Next.js is the frontend. Business rules and database access belong to Express.
- Call the Express API through one typed API client layer.
- Do not duplicate authorization decisions in Server Actions or Route Handlers as a second backend.
- Server Components may read frontend-safe data through the API; mutations still use the established API client.
- Handle session expiration, forbidden responses, validation errors, empty states, and retries consistently.

### shadcn/ui

- Keep shadcn/ui source primitives in `frontend/src/components/ui`.
- Treat generated components as owned source code; customize deliberately and keep APIs stable.
- Add only components needed by current P0 work.
- Do not copy the same shadcn primitive into multiple feature folders.
- Tailwind design tokens are the source for colors, spacing, radius, typography, and status styling.

### Reusable components

Shared reusable components belong in `frontend/src/components/shared`.

Expected reusable components include:

- `PageHeader`
- `DataTable`
- `FilterBar`
- `FormField`
- `StatusBadge`
- `ConfirmDialog`
- `FileUpload`
- `EmptyState`
- `LoadingState`
- `PermissionGate`
- `DashboardCard`

Rules:

- UI primitives and shared components do not fetch business data directly.
- Pass data, callbacks, loading state, error state, and permissions through typed props.
- Keep feature-specific composition in `features/<feature>/components`.
- Extract a component when it is reused or represents a stable cross-feature pattern.
- Do not build a universal component with dozens of unrelated flags.
- Keep feature-owned table column definitions close to the feature; reuse table behavior, not every table shape.
- Support loading, empty, error, disabled, and permission states where relevant.
- Maintain labels, keyboard interaction, focus visibility, semantic elements, and accessible error messages.

### Forms

- Use a schema-based validation approach compatible with shared contracts.
- Client validation improves UX; backend validation remains authoritative.
- Display field-specific backend validation errors.
- Prevent accidental duplicate submissions.
- Preserve drafts when recoverable errors occur.

## 10. Backend Rules

### Express

- Use Express.js 5 with TypeScript and ESM.
- Keep `app.ts` free of the network listener and start the server from `server.ts`.
- Mount the Better Auth catch-all handler before `express.json()`.
- Use the Express 5 Better Auth catch-all route shape.
- Register 404 and error middleware after business routes.
- Production responses must not expose stack traces, SQL, internal paths, secrets, cookies, or tokens.

### Module structure

Each business module should follow:

```text
modules/<domain>/
├── <domain>.routes.ts
├── <domain>.controller.ts
├── <domain>.service.ts
├── <domain>.repository.ts
├── <domain>.schema.ts
└── <domain>.types.ts
```

- Routes define paths and middleware.
- Controllers translate HTTP input/output.
- Services own business rules and transactions.
- Repositories own Prisma queries.
- Schemas validate body, params, and query.
- Controllers must not call Prisma directly.
- Repositories must not decide workflow transitions or role policy.
- Avoid generic “utils” that hide business behavior.

### Error response

Use a consistent error contract:

```json
{
  "error": {
    "code": "REPORT_INVALID_STATUS",
    "message": "Laporan tidak dapat diproses dari status saat ini.",
    "fields": []
  }
}
```

- Use stable machine-readable error codes.
- User-facing messages use Bahasa Indonesia.
- Map validation errors to fields when possible.
- Log internal details server-side with redaction.

## 11. Better Auth Rules

- Better Auth is the owner of authentication and session management.
- Use the Prisma adapter and PostgreSQL-backed sessions.
- Configure `baseURL`, secret, secure cookies, and `trustedOrigins` explicitly.
- Configure CORS with an allowlist and credentials; never use wildcard origins with credentials.
- Keep auth rate limiting enabled for sensitive endpoints.
- Do not store session tokens in localStorage.
- Public self-registration is disabled for the MVP.
- Accounts are provisioned through Admin SIMPATIK workflows.
- Deactivating an account must block new access without deleting historical attribution.
- Never log passwords, reset tokens, session cookies, or authorization headers.

## 12. Prisma and PostgreSQL Rules

- Prisma is used only by the Express backend.
- Keep `schema.prisma` and migrations under version control.
- Never edit an applied production migration; create a new migration.
- Review generated SQL for destructive operations.
- Use database constraints for invariants such as unique report per UPT/period/type.
- Add indexes for actual filter and dashboard query patterns.
- Use transactions for workflow transitions and related audit records.
- Avoid unbounded list queries; use pagination.
- Avoid N+1 queries and unnecessary relation loading.
- Seed scripts must be idempotent where practical and must not create weak production credentials.
- Store timestamps consistently; render user-facing time in Asia/Jakarta.

## 13. File Handling

- Store file bytes outside PostgreSQL; store metadata and storage keys in the database.
- Storage is private by default.
- Generate non-guessable storage keys.
- Preserve original filenames only as metadata.
- Enforce server-side size and MIME allowlists.
- Do not trust extension or browser-provided MIME alone.
- Re-authorize every download.
- Prevent path traversal and public bucket exposure.
- Allow deletion only while the report is editable and policy permits it.
- Do not include file content or signed URLs in logs.

## 14. API Rules

- Use `/api` for application endpoints.
- Use JSON for ordinary requests and multipart only for uploads.
- Use ISO 8601 timestamps in API payloads.
- Use pagination for lists.
- Keep filter parameters explicit and validated.
- CSV exports include applied filters, period, generation time, and actor.
- Preserve backward-compatible response shapes within the MVP unless coordinated across frontend and backend.
- Update shared contracts and both sides in the same change when an API shape changes.

## 15. Security Requirements

- HTTPS is mandatory outside local development.
- Use explicit CORS origins and Better Auth trusted origins.
- Apply secure headers and request-size limits.
- Rate-limit login, reset, upload, and export paths.
- Validate body, params, query, and files.
- Redact secrets and personal data from logs.
- Keep System Administrator actions auditable.
- Treat authorization bypass, cross-UPT access, exposed private files, and leaked secrets as release blockers.
- Do not weaken a security control merely to make a test pass.

## 16. Testing Requirements

For every changed behavior, add the smallest appropriate tests.

### Frontend

- Unit-test reusable component behavior with material branching.
- Test loading, empty, error, disabled, and permission states.
- Test forms and backend field-error mapping.
- Perform visual/responsive QA for changed screens.
- Preserve keyboard and focus behavior.

### Backend

- Unit-test services and workflow transitions.
- Integration-test routes with a test database.
- Test every allowed and denied role transition.
- Test cross-UPT access denial.
- Test upload validation and protected downloads.
- Test error contracts.

### Critical E2E

- Seven roles can authenticate and see the correct navigation.
- Petugas UPT creates a draft.
- Koordinator UPT validates and submits it.
- Petugas Kanwil requests revision or marks it REVIEWED.
- Product Owner approves a REVIEWED report.
- Pimpinan sees dashboard and recap.
- System Administrator cannot read report substance by default.
- Dashboard and CSV reconcile with report source data.

## 17. Agent Working Procedure

Before coding:

1. Read the relevant PRD, Architecture, and task sections.
2. Inspect existing code and tests before proposing structure.
3. Identify the role, UPT scope, workflow state, API, data migration, UI state, and security impact.
4. Keep the change limited to one coherent task or tightly related task group.

While coding:

1. Preserve unrelated user changes.
2. Follow existing naming and repository conventions.
3. Implement backend authorization before relying on UI gates.
4. Reuse established components and services.
5. Avoid broad refactors unless necessary for the task.
6. Add migrations and tests with the implementation.
7. Do not add speculative P1/deferred features.

Before handoff:

1. Run relevant lint, type-check, tests, and builds.
2. Review the diff for secrets, debug code, dead code, and accidental scope expansion.
3. Verify role and UPT negative cases.
4. Verify workflow transitions and audit records.
5. Update documentation when behavior or architecture changed.
6. Mark only completed checklist items in `tasks.md`.
7. Report what changed, what was verified, and any remaining risk or decision.

## 18. Change Control

The following changes require explicit approval and matching documentation updates:

- Adding or removing a role.
- Changing role responsibility or UPT scope.
- Adding or changing report status/transitions.
- Moving business logic into Next.js.
- Replacing Better Auth, Express, Prisma, PostgreSQL, Tailwind CSS, or shadcn/ui.
- Introducing microservices, a message broker, or an additional database.
- Making file storage public.
- Adding an external integration.
- Adding a new P0 feature not present in the PRD.

When approved, update PRD, Architecture, tasks, implementation, tests, and this file as necessary in the same logical change.

## 19. Completion Standard

A task is complete only when:

- Acceptance criteria are met.
- Authorization and UPT scope are correct.
- Relevant tests pass.
- Migration and API contracts are included when needed.
- Reusable UI patterns are followed.
- Security and audit requirements are preserved.
- Documentation is updated.
- No critical defect remains open.
