# Sightline Phase 1 - Delivery, Validation And Roadmap

## 1) Purpose

This document turns the PRD, domain model, and architecture into an implementation-facing delivery plan with milestone slices, validation scenarios, and correctness checks.

It is intentionally phase-1 focused.

## 2) Delivery Strategy

Build phase 1 in vertical slices that prove user value early while preserving the shared platform foundation:

1. platform foundations and access control
2. exam monitoring and alert review
3. faculty risk analytics
4. student schedule and reminder portal
5. trust, operability, and admin hardening

This sequence keeps the primary product value visible early while still delivering the add-on modules in the same release train.

## 3) Milestones

### Milestone 1: Platform Foundations And Access Control

**Outcome**

- Users, roles, departments, courses, semesters, and shared navigation exist.
- The product has a common data model for all three modules.
- Admin users can begin configuring core academic and operational data.

**Includes**

- Django project and module boundaries
- React app shell and role-based navigation
- authentication and authorization
- shared domain models
- audit trail scaffolding
- hall, camera, user, course, and semester setup surfaces

**Acceptance gate**

- a user can sign in, land on the correct role-based surface, and access only the module data allowed for that role

### Milestone 2: Exam Monitoring And Alert Review

**Outcome**

- Invigilators can receive live alerts for supported behaviors.
- Supervisors can inspect evidence and record review actions.

**Includes**

- inference worker skeleton and stream input handling
- supported suspicious-behavior detection pipeline
- alert persistence and live WebSocket updates
- alert dashboard
- alert detail view with evidence
- reviewer decision workflow
- camera and exam session state

**Acceptance gate**

- an invigilator can receive, open, and review a live alert with enough context to decide what to do next

### Milestone 3: Faculty Risk Analytics

**Outcome**

- Faculty and department heads can upload academic data and review at-risk students.

**Includes**

- attendance and assessment import flow
- import validation reporting
- risk calculation worker
- student-level risk view
- course and department summary views
- interpretable factor display

**Acceptance gate**

- a faculty user can upload valid data and see ranked or classified at-risk students with understandable contributing factors

### Milestone 4: Student Schedule And Reminder Portal

**Outcome**

- Students can view class and exam schedules together and receive reminders.

**Includes**

- class schedule management
- exam schedule management
- merged agenda view
- reminder rule configuration
- in-app reminder display
- email reminder delivery

**Acceptance gate**

- a student can open one portal, see upcoming classes and exams, and receive at least one valid reminder through supported channels

### Milestone 5: Trust, Operability, And Admin Hardening

**Outcome**

- Operators can understand degraded state before users lose trust.
- Product trust boundaries are visible and auditable.

**Includes**

- camera health visibility
- inference and worker degraded-state views
- import run history
- reminder delivery history
- audit reports for alert reviews and admin changes
- stale or missing data messaging across the product

**Acceptance gate**

- admin and operator users can identify degraded cameras, failed workers, import problems, and reminder issues without reading raw infrastructure logs

## 4) Implementation Workstreams

| Workstream | What It Produces |
| --- | --- |
| Web app | role-based React surfaces for invigilators, faculty, students, and operators |
| Django control plane | REST APIs, WebSocket orchestration, permissions, audit state, shared product logic |
| Integrity monitoring | hall and camera configuration, alert state, evidence references, reviewer workflows |
| Inference runtime | live stream ingestion, behavior detection, event emission, evidence extraction |
| Analytics pipeline | imports, validation, risk scoring, summary and drill-down views |
| Scheduling and reminders | merged agenda state, reminder generation, notification delivery |
| Shared platform | users, roles, departments, courses, semesters, notifications, health states |
| Trust and operability | degraded-state visibility, auditability, duplicate control, product messaging around uncertainty |

## 5) Validation Scenarios

### Product validation

- An invigilator receives a live suspicious-behavior alert during an active exam.
- The invigilator opens the alert and sees the event type, timestamp, hall context, and evidence.
- The invigilator records a review decision and the updated state remains visible.
- A faculty user uploads attendance and marks, then sees interpretable at-risk outputs.
- A department head drills down from a summary view into specific students and factors.
- A student sees merged class and exam schedules in one agenda view.
- A student receives a reminder for an upcoming class or exam.

### System validation

- The inference worker can create one visible alert from one supported suspicious event window.
- Evidence clips and snapshots are accessible and tied to the alert that references them.
- Import validation rejects malformed files and preserves visible error reporting.
- Risk scoring runs can be retried without corrupting prior results.
- Reminder generation avoids duplicate notifications for the same event and window.
- WebSocket updates reach active dashboards without requiring manual refresh.

### Trust validation

- The product never presents suspicious alerts as autonomous disciplinary decisions.
- The analytics module never presents risk output without visible contributing factors.
- Degraded camera or inference state is visible to operators.
- Missing or stale schedule data is communicated honestly to students and admins.
- Role boundaries hold correctly across invigilator, faculty, student, and operator surfaces.

## 6) Correctness Checks

| ID | Check | What It Validates |
| --- | --- | --- |
| VC-01 | One suspicious event produces one canonical visible alert | alert deduplication |
| VC-02 | Alert evidence remains linked to the alert after review actions | evidence correctness |
| VC-03 | Reviewer decisions remain durable after page reloads and later audits | audit correctness |
| VC-04 | One valid import run produces one coherent scoped risk result set | analytics consistency |
| VC-05 | Invalid or unmatched academic records do not silently alter risk outputs | import correctness |
| VC-06 | One schedule event and reminder window generates one notification event per user | reminder idempotency |
| VC-07 | Degraded cameras or workers appear in operator views | health visibility correctness |
| VC-08 | Role-based access prevents cross-role data leakage | access-control correctness |

## 7) What Phase 1 Is Not

Phase 1 is not:

- an autonomous cheating judgment engine
- an automated disciplinary workflow
- a full student information system
- a complete intervention case-management platform
- a mobile app requirement
- a universal messaging platform with SMS and push in scope
- a guarantee that every suspicious real-world behavior is detectable from every camera angle

This matters because implementation should not quietly expand phase 1 into a much larger academic platform before the core workflows are reliable.

## 8) Phase-2 Hooks

Keep these extension points visible, but not required in phase 1:

- SIS and LMS integrations
- richer behavior models and temporal classifiers
- more supported suspicious behaviors
- SMS and push reminders
- intervention workflow tracking for faculty actions
- continuous model retraining from reviewed alert data
- richer analytics maturity based on semester-end outcomes

## 9) Recommended Planning Breakdown

The implementation backlog should be organized around:

1. shared platform and access control
2. integrity monitoring and alert review
3. analytics imports and risk views
4. schedule and reminder workflows
5. trust, health visibility, and audit hardening

That breakdown maps cleanly to the doc package and avoids mixing product behavior with infrastructure concerns too early.

## 10) Demo Sequence

Use this order for stakeholder demos:

1. sign in as an operator and show hall, camera, and exam setup
2. show a live or simulated suspicious-behavior alert arriving in the invigilator dashboard
3. open the alert and review its evidence and decision flow
4. upload attendance and assessment data as faculty
5. show at-risk outputs for a course and drill down into a student
6. switch to a student view and show the merged agenda and reminder visibility
7. return to the operator view and show degraded-state or processing-health visibility

## 11) Definition Of Done For The Doc Package

The package is implementation-ready when:

- a developer can infer phase-1 scope without relying on external research notes
- every major user story is non-technical and user-outcome driven
- every major user story maps to verifiable EARS-style requirements
- workflows, domain entities, and invariants are consistent across the four docs
- the architecture clearly reflects `Django + React/Vite + Channels + Celery + Redis + PostgreSQL + inference worker`
- Mermaid diagrams clarify the product and system model rather than restating prose
- engineering can break the package into tasks without inventing hidden business rules
