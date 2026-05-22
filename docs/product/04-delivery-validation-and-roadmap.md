# Sightline MVP - Delivery, Validation And Roadmap

## 1) Delivery Strategy

Build the smallest complete product first:

1. auth, roles, seed data, and Django admin setup
2. teacher course and exam workflows
3. student enrollment and exam submission
4. invigilator video upload and alert/evidence review
5. teacher at-risk student view
6. ProcBot browser monitoring after the core MVP is stable

## 2) Milestones

### Milestone 1: Roles And Admin

**Outcome**

- Four roles exist: `admin`, `teacher`, `invigilator`, `student`.
- Seed data creates 1 admin, 3 invigilators, 5 teachers, and 20 students.
- Admin can manage everything through Django admin and admin APIs.

**Acceptance gate**

- A seeded admin can log in and manage users/domain records.

### Milestone 2: Teacher Courses And Exams

**Outcome**

- Teacher can create courses.
- Teacher can create exams for their courses.
- Teacher can optionally upload course material later if needed.

**Acceptance gate**

- A seeded teacher can create a course and exam without admin help.

### Milestone 3: Student Enrollment And Exam Submission

**Outcome**

- Student can enroll in a course.
- Student can give/submit an exam.

**Acceptance gate**

- A seeded student can enroll and submit an exam attempt for an available exam.

### Milestone 4: Invigilator Video Upload And Review

**Outcome**

- Invigilator can upload an exam video.
- Video analysis can create alert/evidence records.
- Invigilator can monitor/review alerts and exam evidence.

**Acceptance gate**

- A seeded invigilator can upload a video and review at least one alert/evidence record.

### Milestone 5: Teacher At-Risk Student Support

**Outcome**

- Teacher can identify academically at-risk students before the semester ends.
- Risk output is scoped to course context and includes contributing factors where available.

**Acceptance gate**

- A seeded teacher can open or run risk analysis and see student-level results.

### Milestone 6: ProcBot Browser Monitoring

**Outcome**

- ProcBot activates when a student opens a BLC quiz.
- Tab switch is detected in realtime.
- FaceGone and MultiPerson checks run every 5 seconds.
- Phone detection runs every 15-20 seconds.
- Anomalies create WebSocket events to FastAPI and dashboard alerts with evidence screenshots.

**Acceptance gate**

- A simulated browser anomaly creates a dashboard alert with the expected detection type and evidence screenshot.

## 3) Validation Scenarios

- Admin creates or updates a user role through Django admin.
- Teacher creates a course.
- Teacher creates an exam for that course.
- Student enrolls in the course.
- Student submits an exam attempt.
- Invigilator uploads an exam video for the exam session.
- An alert appears with evidence for invigilator review.
- Invigilator confirms, dismisses, or marks the alert for follow-up.
- Teacher views at-risk students for a course.
- ProcBot TabSwitch event appears in realtime.
- ProcBot FaceGone and MultiPerson checks run every 5 seconds.
- ProcBot Phone checks run every 15-20 seconds.

## 4) Correctness Checks

| ID | Check |
| --- | --- |
| VC-01 | Admin-only APIs reject non-admin users. |
| VC-02 | Teacher cannot manage another teacher's course unless admin. |
| VC-03 | Student cannot submit another student's exam attempt. |
| VC-04 | Invigilator can upload videos and review alerts but cannot make disciplinary verdicts. |
| VC-05 | Alert evidence remains linked after review actions. |
| VC-06 | Risk output is scoped to a course and remains interpretable. |
| VC-07 | ProcBot uses realtime checks only for TabSwitch. |
| VC-08 | ProcBot runs phone detection less frequently than face detection. |

## 5) What The MVP Is Not

- not a full LMS
- not a complete SIS
- not a disciplinary automation system
- not live CCTV monitoring
- not a large custom admin frontend
- not a mobile app
- not a guarantee that every suspicious behavior is detectable

## 6) Demo Sequence

1. Log in as admin and show Django admin/API management.
2. Log in as teacher and create a course.
3. Create an exam for that course.
4. Log in as student and enroll in the course.
5. Submit an exam attempt.
6. Log in as invigilator and upload an exam video.
7. Review an alert with evidence.
8. Return to teacher and show at-risk student output.
9. Demonstrate or simulate ProcBot browser anomaly flow.

