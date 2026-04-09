# Sightline Phase 1 - Domain Workflows And Data

## 1) Purpose

This document explains the domain model, user workflows, lifecycle states, data ownership boundaries, and correctness properties for phase 1.

It should be readable by:

- engineers implementing backend, inference, and UI workflows
- product stakeholders validating user-visible behavior
- operators who need to understand how alerts, imports, schedules, and reminders move through the system

## 2) End-To-End User Workflows

The platform has three primary phase-1 journeys:

- `configure -> monitor exam -> review alert -> take action`
- `import academic data -> calculate risk -> review at-risk students -> intervene`
- `manage schedule -> generate reminders -> student views agenda -> attends exam or class`

```mermaid
flowchart LR
  subgraph Integrity[Exam Integrity]
    CFG[Configure Halls And Cameras] --> MON[Monitor Exam Session]
    MON --> DET[Supported Behavior Detected]
    DET --> ALT[Alert Created]
    ALT --> REV[Reviewer Opens Alert]
    REV --> ACT[Confirm Dismiss Or Follow Up]
  end

  subgraph Analytics[Risk Analytics]
    IMP[Import Attendance And Assessment Data] --> CALC[Calculate Risk]
    CALC --> RSK[Faculty Reviews At-Risk Students]
    RSK --> INTV[Intervention Decision]
  end

  subgraph Schedules[Schedules And Reminders]
    SCH[Manage Class And Exam Schedule] --> REM[Generate Reminders]
    REM --> AGD[Student Views Agenda]
    AGD --> ATT[Student Attends Event]
  end
```

## 3) Workflow Notes

- `Configuration` is the operational front door for hall, user, schedule, and import setup.
- `Exam monitoring` creates time-sensitive alerts, but the user-visible outcome is reviewable suspicion, not a cheating verdict.
- `Risk analytics` turns imported academic records into interpretable student and department views.
- `Schedules and reminders` make academic events visible and proactive for students.
- `Shared platform state` connects users, courses, semesters, roles, notifications, and audit history across all modules.

## 4) Core Domain Entities

- `Hall`: a physical exam hall or academic location monitored or scheduled by the platform
- `Camera`: a configured video source associated with a hall
- `Seat`: a seat region or desk position within a hall
- `ExamSession`: a scheduled exam event being monitored
- `AlertEvent`: a visible suspicious-behavior alert tied to a time window and context
- `EvidenceAsset`: a snapshot, clip, or other retained evidence for an alert
- `ReviewerAction`: a durable record of a reviewer decision on an alert
- `Department`: an organizational academic unit
- `Course`: a course or subject within a department or semester context
- `Semester`: an academic period used for schedules, analytics, and reporting boundaries
- `StudentProfile`: the canonical student record used across schedules, analytics, and notifications
- `FacultyProfile`: the canonical faculty or department-head record used across courses and analytics views
- `AcademicRecordImport`: a submitted attendance or assessment import with validation outcome
- `AttendanceRecord`: attendance data tied to a student, course, and period
- `AssessmentRecord`: quiz, midterm, or other scored assessment data tied to a student and course
- `RiskAssessmentRun`: a durable run that calculates risk outputs from available academic data
- `StudentRiskScore`: the resulting risk output for a student in a course or cohort context
- `ClassSchedule`: a scheduled teaching event
- `ExamSchedule`: a scheduled exam event
- `ReminderRule`: a rule describing when reminders should be generated for an event type
- `NotificationEvent`: a reminder or system notification visible or deliverable to a user

## 5) Entity Relationship Diagram

```mermaid
erDiagram
  DEPARTMENT ||--o{ COURSE : owns
  SEMESTER ||--o{ COURSE : contains
  HALL ||--o{ CAMERA : contains
  HALL ||--o{ SEAT : contains
  HALL ||--o{ EXAM_SESSION : hosts
  EXAM_SESSION ||--o{ ALERT_EVENT : emits
  CAMERA ||--o{ ALERT_EVENT : contributes_to
  SEAT ||--o{ ALERT_EVENT : relates_to
  ALERT_EVENT ||--o{ EVIDENCE_ASSET : contains
  ALERT_EVENT ||--o{ REVIEWER_ACTION : reviewed_by
  STUDENT_PROFILE ||--o{ ATTENDANCE_RECORD : has
  STUDENT_PROFILE ||--o{ ASSESSMENT_RECORD : has
  COURSE ||--o{ ATTENDANCE_RECORD : scopes
  COURSE ||--o{ ASSESSMENT_RECORD : scopes
  SEMESTER ||--o{ ACADEMIC_RECORD_IMPORT : groups
  ACADEMIC_RECORD_IMPORT ||--o{ ATTENDANCE_RECORD : creates
  ACADEMIC_RECORD_IMPORT ||--o{ ASSESSMENT_RECORD : creates
  RISK_ASSESSMENT_RUN ||--o{ STUDENT_RISK_SCORE : produces
  STUDENT_PROFILE ||--o{ STUDENT_RISK_SCORE : receives
  COURSE ||--o{ STUDENT_RISK_SCORE : contextualizes
  STUDENT_PROFILE ||--o{ CLASS_SCHEDULE : follows
  STUDENT_PROFILE ||--o{ EXAM_SCHEDULE : follows
  CLASS_SCHEDULE ||--o{ NOTIFICATION_EVENT : triggers
  EXAM_SCHEDULE ||--o{ NOTIFICATION_EVENT : triggers
  REMINDER_RULE ||--o{ NOTIFICATION_EVENT : shapes
```

## 6) Lifecycle Models

### 6.1 Alert Event Lifecycle

```mermaid
stateDiagram-v2
  [*] --> Detected
  Detected --> PendingEvidence: AlertCreated
  PendingEvidence --> Visible: EvidenceLinked
  Visible --> Confirmed: ReviewerConfirmed
  Visible --> Dismissed: ReviewerDismissed
  Visible --> FollowUp: ReviewerMarkedFollowUp
  Confirmed --> Closed: SessionOrReviewClosed
  Dismissed --> Closed: SessionOrReviewClosed
  FollowUp --> Closed: ActionCompleted
  Closed --> [*]
```

### 6.2 Camera Lifecycle

```mermaid
stateDiagram-v2
  [*] --> Provisioned
  Provisioned --> Active: SourceValidated
  Active --> Degraded: FeedInterruptedOrInferenceUnhealthy
  Degraded --> Active: RecoveryConfirmed
  Active --> Disabled: OperatorDisabled
  Degraded --> Disabled: OperatorDisabled
  Disabled --> [*]
```

### 6.3 Exam Session Lifecycle

```mermaid
stateDiagram-v2
  [*] --> Scheduled
  Scheduled --> Prepared: HallsAndCamerasReady
  Prepared --> Live: StartTimeReached
  Live --> Completed: MonitoringEnded
  Scheduled --> Cancelled: OperatorCancelled
  Prepared --> Cancelled: OperatorCancelled
  Completed --> [*]
  Cancelled --> [*]
```

### 6.4 Risk Assessment Run Lifecycle

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Queued: ValidImportAvailable
  Queued --> Running: WorkerStarted
  Running --> Completed: ScoresPersisted
  Running --> Failed: ValidationOrProcessingFailure
  Failed --> Queued: RetryRequested
  Completed --> Superseded: NewerRunAvailable
  Superseded --> [*]
```

### 6.5 Notification Lifecycle

```mermaid
stateDiagram-v2
  [*] --> Scheduled
  Scheduled --> Ready: ReminderWindowReached
  Ready --> DeliveredInApp: InAppCreated
  Ready --> DeliveredEmail: EmailSent
  DeliveredInApp --> Acknowledged: UserViewed
  DeliveredEmail --> Acknowledged: UserViewedOrNoFurtherAction
  Ready --> Failed: DeliveryFailure
  Failed --> Ready: RetryAllowed
  Acknowledged --> [*]
```

## 7) Data Ownership Boundaries

### Video and inference evidence

Owned by:

- inference worker runtime
- evidence generation pipeline
- object storage

Examples:

- source stream metadata
- per-frame detection summaries
- alert snapshots
- alert replay clips

### Canonical product state

Owned by:

- Django control plane
- PostgreSQL
- audit and review services

Examples:

- halls, cameras, seats
- exam sessions
- alerts and reviewer actions
- users, roles, departments, courses, semesters

### Academic analytics state

Owned by:

- import processing workers
- analytics services
- PostgreSQL

Examples:

- import batches
- attendance records
- assessment records
- risk runs and risk scores

### Scheduling and reminder state

Owned by:

- scheduling services
- reminder workers
- Django notification services

Examples:

- class schedules
- exam schedules
- reminder rules
- notification events

## 8) Normalized Event Contracts

### Alert event contract

Every visible exam-monitoring alert should normalize into a common alert shape:

- `alertId`
- `alertType`
- `occurredAt`
- `examSessionId`
- `hallId`
- `cameraId`
- `seatId` or `studentId` when available
- `confidenceScore`
- `visibilityQuality`
- `evidenceAssetIds`
- `status`

### Risk result contract

Every durable risk run should normalize into a common scoring shape:

- `riskRunId`
- `studentId`
- `courseId`
- `semesterId`
- `riskLevel`
- `riskScore`
- `contributingFactors`
- `generatedAt`
- `sourceImportIds`

### Reminder event contract

Every reminder should normalize into a common notification shape:

- `notificationId`
- `recipientUserId`
- `eventType`
- `scheduleId`
- `channel`
- `scheduledFor`
- `generatedAt`
- `deliveryState`
- `idempotencyKey`

## 9) Cross-Module Data Flow

```mermaid
sequenceDiagram
    participant OP as Admin Or Operator
    participant UI as Product UI
    participant API as Django API
    participant INF as Inference Worker
    participant DB as PostgreSQL
    participant CEL as Celery Workers

    OP->>UI: Configure hall camera and schedule
    UI->>API: Save configuration
    API->>DB: Persist hall camera user and schedule state

    INF->>DB: Persist alert metadata and evidence reference
    DB-->>UI: Alert visible to invigilator

    OP->>UI: Upload academic records
    UI->>API: Submit import
    API->>DB: Create import batch
    API->>CEL: Queue validation and scoring
    CEL->>DB: Persist attendance assessment and risk results
    DB-->>UI: Faculty risk views updated

    API->>CEL: Queue reminder generation
    CEL->>DB: Persist notification events
    DB-->>UI: Student agenda and reminders visible
```

## 10) Correctness Properties

These invariants must hold even as implementation evolves.

| ID | Property | What It Means |
| --- | --- | --- |
| CP-01 | One suspicious event creates one canonical visible alert | Prevent duplicate user-visible noise for the same event window |
| CP-02 | No meaningful suspicious behavior produces no visible alert | Thresholding should suppress weak or transient events |
| CP-03 | Reviewer decisions are durable and auditable | Confirm, dismiss, and follow-up actions remain inspectable |
| CP-04 | Evidence remains linked to the alert it explains | Alert context must not drift away from its retained evidence |
| CP-05 | Imported records map consistently to one student, course, and semester context | Analytics correctness depends on stable identity mapping |
| CP-06 | One risk run produces one coherent set of student risk outputs for its scoped data | Prevent mixed or partially overwritten analytics state |
| CP-07 | Reminder generation is idempotent by event window and user | Duplicate reminders should not be produced for the same schedule window |
| CP-08 | Operational health changes alter user-visible state | Degraded cameras, workers, or imports must not remain hidden |

## 11) Product-Level Domain Rules

- `AlertEvent` represents suspicious behavior that requires human review, not a cheating verdict.
- `ReviewerAction` does not erase the alert; it explains how the alert was handled.
- `EvidenceAsset` is durable reference material, not a replacement for the alert record.
- `AcademicRecordImport` is the boundary between raw uploaded files and validated academic records.
- `RiskAssessmentRun` produces interpretable outputs and should be traceable to the data used.
- `ClassSchedule` and `ExamSchedule` are separate sources of student obligations but must be mergeable in the agenda view.
- `ReminderRule` defines when notifications should be generated, not whether a schedule item exists.
- `NotificationEvent` is the durable record of reminder generation and delivery state.

## 12) What This Domain Model Optimizes For

- live reviewable exam supervision
- durable and auditable faculty decision support
- low-friction student schedule awareness
- one shared platform model across three user-facing modules
- future integrations and model changes without breaking the user-facing concepts
