# Sightline Phase 1 - Product Requirements

## 1) Purpose

This PRD defines Sightline phase 1 as a unified `academic integrity platform` for exam supervision, faculty decision support, and student schedule visibility.

The goal is not just to process video or academic records. The goal is to help users:

- detect suspicious exam behavior faster and more consistently
- review alerts with enough context to act responsibly
- identify academically at-risk students before the semester ends
- coordinate classes, exams, and reminders in one place
- operate halls, cameras, schedules, and users without engineering intervention

Phase 1 is `exam monitoring first`, but it also includes faculty analytics and student reminders in the same product.

## 2) Phase-1 Outcomes

- Invigilators can receive live suspicious-behavior alerts from CCTV-monitored exam halls.
- Invigilators can review alert evidence before taking action.
- Faculty and department heads can identify at-risk students from imported attendance and assessment data.
- Students can view combined class and exam schedules in one portal.
- Students can receive reminders for upcoming classes and exams.
- Admin and operator users can configure halls, cameras, schedules, users, and platform health controls.
- Engineering can validate implementation against clear product requirements, scope boundaries, and correctness properties.

## 3) Scope and Constraints (Phase 1)

### In scope

- live AI-assisted exam monitoring from CCTV feeds
- suspicious-behavior alerting for supported behaviors
- alert evidence review workflow
- faculty-facing risk analytics from imported academic records
- department and course-level risk views
- student portal for class schedules, exam schedules, and reminders
- admin and operator controls for cameras, halls, users, imports, and notification settings
- audit-friendly review and decision history

### Secondary but in scope

- camera health and degraded-state visibility
- import validation and scoring history
- in-app and email reminders
- WebSocket-based live alert delivery

### Out of scope

- autonomous cheating verdicts or disciplinary decisions
- high-stakes automated academic sanctions
- SMS or push notifications in phase 1
- deep SIS/LMS integrations in phase 1
- broad behavior-anomaly research tooling beyond supported behaviors
- full video wall operations center as a phase-1 requirement

## 4) Personas and Jobs-to-be-Done

| Persona | What They Actually Want |
| --- | --- |
| `Invigilator / Exam Supervisor` | Notice suspicious behavior quickly, review why an alert fired, and act without manually watching every student at once |
| `Faculty` | Identify weak or irregular students early enough to intervene before final outcomes are locked in |
| `Department Head` | See which courses or student groups need attention and prioritize limited intervention time |
| `Student` | Check classes and exams in one place and get reminders without maintaining separate schedules |
| `Admin / Operator` | Configure cameras, halls, users, imports, schedules, and platform settings without relying on engineering support |

## 5) Product Pillars

| Pillar | What It Means In Phase 1 |
| --- | --- |
| `Exam Monitoring` | Detect supported suspicious behaviors in live CCTV feeds and surface reviewable alerts |
| `Evidence Review` | Show snapshots, clips, timestamps, and seat or hall context so supervisors can interpret alerts responsibly |
| `Risk Analytics` | Turn attendance and assessment imports into interpretable at-risk indicators for faculty and department heads |
| `Schedules And Reminders` | Present merged class and exam schedules with configurable reminder rules for students |
| `Operations And Trust` | Expose camera health, import quality, review history, and product limits clearly enough for users to trust the system |

## 6) User Story Driven Requirements (with EARS Acceptance Criteria)

### US-01: Notice Suspicious Behavior Without Watching Everyone At Once

**User Story:**  
As an `invigilator`, I want to receive alerts about suspicious student behavior during an exam, so I can `focus my attention where it is most needed instead of trying to watch every student continuously`.

**Why this matters:**  
Human invigilators cannot observe every student at every moment. The product must reduce attention overload without pretending to replace human judgment.

**Acceptance Criteria (EARS):**

| ID | Criteria |
| --- | --- |
| US-01.1 | **WHEN** a supported suspicious behavior is detected with enough persistence and confidence, **THE SYSTEM SHALL** create a live alert for the relevant exam session and camera context. |
| US-01.2 | **WHEN** a live alert is created, **THE SYSTEM SHALL** show the hall, camera, approximate seat or student context where available, and event timestamp. |
| US-01.3 | **IF** observed behavior does not meet product-defined persistence or confidence thresholds, **THEN THE SYSTEM SHALL** avoid creating a user-visible alert. |
| US-01.4 | **THE SYSTEM SHALL** support at least the phase-1 behaviors of repeated look-away, looking toward neighboring desks, and unauthorized device presence. |

**Validates:** FR-001, FR-002, NFR-001, NFR-004

---

### US-02: Understand Why An Alert Fired Before Acting

**User Story:**  
As an `invigilator`, I want to review why an alert was generated, so I can `make a responsible supervision decision instead of reacting to unexplained automation`.

**Why this matters:**  
Suspicion without evidence becomes noise and undermines trust. Supervisors need just enough context to confirm, dismiss, or follow up on alerts.

**Acceptance Criteria (EARS):**

| ID | Criteria |
| --- | --- |
| US-02.1 | **WHEN** a user opens an alert, **THE SYSTEM SHALL** show the alert type, time window, evidence snapshot or clip, and confidence context. |
| US-02.2 | **WHEN** a reviewer takes an action on an alert, **THE SYSTEM SHALL** record the decision and preserve an audit trail. |
| US-02.3 | **IF** alert confidence or visibility quality is degraded, **THEN THE SYSTEM SHALL** expose that uncertainty in the alert context. |
| US-02.4 | **THE SYSTEM SHALL** allow a reviewer to confirm, dismiss, or mark an alert for follow-up without deleting the underlying record. |

**Validates:** FR-003, FR-004, NFR-003, NFR-006

---

### US-03: Identify At-Risk Students Before The Semester Ends

**User Story:**  
As a `faculty` user, I want to identify academically at-risk students from attendance and assessment data, so I can `intervene before final outcomes are locked in`.

**Why this matters:**  
Faculty need an early-warning view, not just retrospective reporting. The system should help them notice weak patterns before they become failures.

**Acceptance Criteria (EARS):**

| ID | Criteria |
| --- | --- |
| US-03.1 | **WHEN** valid attendance and assessment data is imported, **THE SYSTEM SHALL** calculate student-level risk outputs for the selected course or cohort. |
| US-03.2 | **WHEN** risk outputs are shown, **THE SYSTEM SHALL** present interpretable contributing factors such as attendance, score trend, or missing assessments. |
| US-03.3 | **IF** imported data is incomplete, invalid, or unmatched, **THEN THE SYSTEM SHALL** show import issues clearly rather than silently producing unreliable risk output. |
| US-03.4 | **THE SYSTEM SHALL** classify or rank students in a way that helps faculty prioritize review and intervention. |

**Validates:** FR-005, FR-006, NFR-002, NFR-007

---

### US-04: Prioritize Risk At Department Level

**User Story:**  
As a `department head`, I want to see at-risk students and weak areas by course or cohort, so I can `prioritize support where it will have the highest impact`.

**Why this matters:**  
Department leadership needs summary views that support triage, not raw spreadsheets that still require manual analysis.

**Acceptance Criteria (EARS):**

| ID | Criteria |
| --- | --- |
| US-04.1 | **WHEN** a department head opens the analytics view, **THE SYSTEM SHALL** show risk summaries by department, course, or cohort where data exists. |
| US-04.2 | **WHEN** a summary is selected, **THE SYSTEM SHALL** allow drill-down to the underlying students and factors. |
| US-04.3 | **IF** a course or cohort has no recent data, **THEN THE SYSTEM SHALL** show a clear no-data or stale-data state. |
| US-04.4 | **THE SYSTEM SHALL** preserve a distinction between summary indicators and individual student-level records. |

**Validates:** FR-006, FR-007, NFR-005, NFR-007

---

### US-05: See Classes And Exams In One Place

**User Story:**  
As a `student`, I want to view my class and exam schedules together, so I can `understand my upcoming academic responsibilities without checking multiple sources`.

**Why this matters:**  
Students should not have to reconcile separate class routines, exam notices, and informal reminders manually.

**Acceptance Criteria (EARS):**

| ID | Criteria |
| --- | --- |
| US-05.1 | **WHEN** a student opens the schedule view, **THE SYSTEM SHALL** show upcoming class and exam events in a unified agenda. |
| US-05.2 | **WHEN** event details are shown, **THE SYSTEM SHALL** include date, time, course, and location or hall context where available. |
| US-05.3 | **IF** no schedule is currently available for the selected period, **THEN THE SYSTEM SHALL** show a clear empty state rather than a broken or ambiguous view. |
| US-05.4 | **THE SYSTEM SHALL** ensure students only see schedule data that applies to their own academic context. |

**Validates:** FR-008, FR-009, NFR-006, NFR-008

---

### US-06: Receive Reminders Before Important Events

**User Story:**  
As a `student`, I want to receive reminders about upcoming classes and exams, so I can `prepare on time and avoid missing important events`.

**Why this matters:**  
Schedules become more useful when they are proactive. Reminders should reduce avoidable misses without becoming noisy.

**Acceptance Criteria (EARS):**

| ID | Criteria |
| --- | --- |
| US-06.1 | **WHEN** a scheduled reminder window is reached, **THE SYSTEM SHALL** create the configured reminder notification for the relevant student and event. |
| US-06.2 | **WHEN** reminders are shown or delivered, **THE SYSTEM SHALL** identify the event, its time, and the type of reminder. |
| US-06.3 | **IF** the same event and reminder window has already been processed, **THEN THE SYSTEM SHALL** avoid generating duplicate reminders. |
| US-06.4 | **THE SYSTEM SHALL** support in-app reminders and email reminders in phase 1. |

**Validates:** FR-010, FR-011, NFR-004, NFR-008

---

### US-07: Configure The Platform Without Engineering Help

**User Story:**  
As an `admin / operator`, I want to configure halls, cameras, users, imports, and schedules through the product, so I can `keep the platform operational without relying on engineering for routine setup`.

**Why this matters:**  
Operational control is part of the product. If normal administration requires direct engineering support, adoption will stall.

**Acceptance Criteria (EARS):**

| ID | Criteria |
| --- | --- |
| US-07.1 | **WHEN** an admin configures halls, cameras, users, or schedules, **THE SYSTEM SHALL** persist and expose those configurations through operator-facing surfaces. |
| US-07.2 | **WHEN** academic data imports are submitted, **THE SYSTEM SHALL** validate file structure and record import outcomes. |
| US-07.3 | **IF** a camera, inference pipeline, or background process enters a degraded state, **THEN THE SYSTEM SHALL** expose that state in an operator-facing view. |
| US-07.4 | **THE SYSTEM SHALL** keep operational changes and review actions connected through audit-friendly state rather than ad hoc manual conventions. |

**Validates:** FR-012, FR-013, NFR-003, NFR-009

## 7) Cross-Cutting Functional Requirements

| ID | Requirement | Supports |
| --- | --- | --- |
| FR-001 | Detect and surface supported suspicious behaviors during live exam monitoring | US-01 |
| FR-002 | Associate alerts with exam, hall, camera, and seat or student context where available | US-01 |
| FR-003 | Provide alert detail views with evidence and confidence context | US-02 |
| FR-004 | Persist reviewer decisions and alert audit history | US-02 |
| FR-005 | Import attendance and assessment records for analytics workflows | US-03 |
| FR-006 | Calculate interpretable student risk outputs from imported academic data | US-03, US-04 |
| FR-007 | Provide course, cohort, and department risk summaries with drill-down | US-04 |
| FR-008 | Present merged class and exam schedules in the student portal | US-05 |
| FR-009 | Enforce student-specific schedule visibility | US-05 |
| FR-010 | Generate reminders from configured class and exam schedules | US-06 |
| FR-011 | Deliver and display in-app and email reminders | US-06 |
| FR-012 | Provide admin controls for halls, cameras, schedules, users, and imports | US-07 |
| FR-013 | Expose operational health for cameras, inference, imports, and notifications | US-07 |

## 8) Non-Functional Requirements

| ID | Requirement | Target | Rationale |
| --- | --- | --- | --- |
| NFR-001 | Alert latency | fast enough for live supervision use | Alerts must arrive while intervention is still meaningful |
| NFR-002 | Analytics interpretability | faculty can understand why a student is marked at risk | Decision-support tooling must stay explainable |
| NFR-003 | Auditability | alert reviews, imports, and admin changes are durably recorded | Trust depends on inspectable history |
| NFR-004 | Duplicate control | alerts and reminders avoid noisy duplication | Noise erodes user trust quickly |
| NFR-005 | Summary correctness | department views reflect underlying student and course state consistently | Leadership decisions require coherent aggregation |
| NFR-006 | Usability | primary user workflows are low-friction and readable | The system must reduce manual coordination, not add to it |
| NFR-007 | Replaceability | analytics logic can evolve without changing user-facing meaning | Phase 1 should not trap the system in one model implementation |
| NFR-008 | Honest communication | the UI shows missing, stale, or unavailable states clearly | Product trust depends on explicit limits |
| NFR-009 | Operability | camera, worker, import, and reminder health are visible without log-diving | Admin users need actionable operational visibility |

## 9) Requirement Traceability Matrix

| User Story | Core Capabilities | Primary Architecture Modules |
| --- | --- | --- |
| US-01 | Live suspicious-behavior detection, alert creation | Integrity Monitoring, Inference Worker, Notifications |
| US-02 | Alert evidence review, reviewer decisions, audit trail | Integrity Monitoring, Evidence Storage, Shared Platform |
| US-03 | Academic imports, risk scoring, student-level analytics | Analytics, Shared Platform |
| US-04 | Course and department risk summaries | Analytics, Shared Platform |
| US-05 | Unified student agenda | Schedules And Reminders, Shared Platform |
| US-06 | Reminder generation and delivery | Schedules And Reminders, Notifications |
| US-07 | Configuration, import validation, health visibility | Admin And Operator Controls, Shared Platform |

## 10) Release Readiness Checklist

Before implementation is considered phase-1 ready, verify:

- [ ] Live exam alerts exist for supported behaviors and do not imply autonomous disciplinary decisions
- [ ] Alert detail views show enough evidence and context for responsible review
- [ ] Reviewer actions are durably stored and auditable
- [ ] Academic imports can produce interpretable risk outputs with visible validation issues
- [ ] Department and faculty views can summarize and drill down into risk state
- [ ] Students can view merged class and exam schedules in one place
- [ ] Reminder workflows generate timely in-app and email reminders without duplicates
- [ ] Admin and operator users can manage configuration and see degraded operational states
- [ ] Product surfaces communicate uncertainty, stale data, and system limits honestly
