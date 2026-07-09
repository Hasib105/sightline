import logging

from django.core.mail import send_mail
from django.db.models import Sum
from django.utils import timezone

from . import predict
from .models import (
    AssessmentRecord,
    AttendanceRecord,
    ClassSchedule,
    CourseEnrollment,
    ExamSchedule,
    FacultyActionLog,
    NotificationEvent,
    ReminderRule,
    RiskAssessmentRun,
    ScheduledSession,
    StudentProfile,
    StudentRiskScore,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Feature extraction for failure prediction
# ---------------------------------------------------------------------------

def _ratio(score, max_score):
    max_score = float(max_score or 0)
    if max_score <= 0:
        return None
    return max(0.0, min(1.0, float(score) / max_score))


def _trend(ratios):
    """Map a chronological grade series to 0..1 (improving=1, flat=0.5, declining=0)."""
    if len(ratios) < 2:
        return 0.5
    mid = len(ratios) // 2
    first = sum(ratios[:mid]) / max(mid, 1)
    second = sum(ratios[mid:]) / max(len(ratios) - mid, 1)
    return max(0.0, min(1.0, 0.5 + (second - first)))


def extract_student_features(student, course):
    """Build the 0..1 feature vector for a student in a course from all their records.

    Missing signals default to a neutral 0.5 so absent data is not treated as failure.
    """
    features = {key: 0.5 for key in predict.FEATURE_KEYS}

    attendance = AttendanceRecord.objects.filter(student=student, course=course).aggregate(
        attended=Sum("attended"), total=Sum("total")
    )
    if attendance["total"]:
        features["attendance_rate"] = max(0.0, min(1.0, attendance["attended"] / attendance["total"]))

    assessments = list(
        AssessmentRecord.objects.filter(student=student, course=course).order_by("created_at", "id")
    )
    quizzes, assignments, all_ratios = [], [], []
    for record in assessments:
        ratio = _ratio(record.score, record.max_score)
        if ratio is None:
            continue
        all_ratios.append(ratio)
        label = (record.label or "").lower()
        if "quiz" in label:
            quizzes.append(ratio)
        elif "midterm" in label:
            features["midterm_grade"] = ratio  # latest chronologically wins
        elif "assignment" in label:
            assignments.append(ratio)
        elif "participation" in label:
            features["participation_score"] = ratio

    if quizzes:
        features["quiz_avg"] = sum(quizzes) / len(quizzes)
    if assignments:
        submitted = sum(1 for r in assignments if r > 0)
        features["assignment_completion"] = submitted / len(assignments)
    if all_ratios:
        features["submission_frequency"] = min(1.0, sum(1 for r in all_ratios if r > 0) / len(all_ratios))
        features["grade_trend"] = _trend(all_ratios)

    gpa = float(student.previous_gpa or 0)
    if gpa > 0:
        features["previous_gpa"] = max(0.0, min(1.0, gpa / 4.0))

    return features


# ---------------------------------------------------------------------------
# Risk run
# ---------------------------------------------------------------------------

def calculate_risk_run(source_import, course):
    """Score every student in a course with the ML model and persist a run."""
    run = RiskAssessmentRun.objects.create(
        semester=source_import.semester,
        course=course,
        source_import=source_import,
        status=RiskAssessmentRun.STATUS_COMPLETED,
        model_name=predict.model_name(),
        feature_importance=predict.feature_importance(),
    )

    student_ids = set(
        CourseEnrollment.objects.filter(course=course).values_list("student_id", flat=True)
    )
    student_ids.update(
        AttendanceRecord.objects.filter(course=course).values_list("student_id", flat=True)
    )
    student_ids.update(
        AssessmentRecord.objects.filter(course=course).values_list("student_id", flat=True)
    )

    high_risk = []
    for student in StudentProfile.objects.filter(id__in=student_ids):
        features = extract_student_features(student, course)
        score, level, factors = predict.predict(features)
        risk = StudentRiskScore.objects.create(
            run=run,
            student=student,
            course=course,
            risk_level=level,
            risk_score=score,
            contributing_factors=factors,
            features=features,
        )
        if level == StudentRiskScore.LEVEL_HIGH:
            high_risk.append(risk)

    if high_risk:
        notify_faculty_of_risk(course, run, high_risk)

    return run


def notify_faculty_of_risk(course, run, high_risk_scores):
    """Email the course teacher about high-risk students and log the action."""
    teacher = course.teacher
    recipient = getattr(teacher, "email", "") if teacher else ""
    names = ", ".join(f"{s.student.full_name} ({s.risk_score})" for s in high_risk_scores)
    subject = f"[Sightline] {len(high_risk_scores)} at-risk student(s) in {course.code}"
    body = (
        f"The latest risk run ({run.model_name}) for {course.code} - {course.title} "
        f"flagged {len(high_risk_scores)} high-risk student(s):\n\n{names}\n\n"
        "Review the faculty dashboard for contributing factors and next steps."
    )
    if recipient:
        try:
            send_mail(subject, body, None, [recipient], fail_silently=True)
        except Exception:  # pragma: no cover - email backend issues shouldn't break scoring
            logger.exception("Failed to send at-risk faculty email for %s", course.code)

    for score in high_risk_scores:
        FacultyActionLog.objects.create(
            faculty=teacher,
            student=score.student,
            course=course,
            risk_score=score,
            action=FacultyActionLog.ACTION_AUTO_EMAIL,
            note=f"Auto-flagged at risk score {score.risk_score}/100.",
        )


# ---------------------------------------------------------------------------
# Scheduling
# ---------------------------------------------------------------------------

def scheduling_conflicts(hall_id, starts_at, ends_at, invigilator_id=None, course_id=None, exclude_id=None):
    """Return a list of conflict dicts for a proposed scheduled session.

    Overlap rule: existing.starts_at < new.ends_at AND existing.ends_at > new.starts_at.
    Checks room double-booking, invigilator double-booking, and student timetable clashes.
    """
    conflicts = []
    overlapping = ScheduledSession.objects.filter(starts_at__lt=ends_at, ends_at__gt=starts_at)
    if exclude_id:
        overlapping = overlapping.exclude(id=exclude_id)
    overlapping = overlapping.select_related("course", "hall", "invigilator")

    for session in overlapping.filter(hall_id=hall_id):
        conflicts.append(
            {
                "type": "room",
                "message": f"Room {session.hall.name} is already booked for {session.course.code}",
                "session_id": session.id,
            }
        )

    if invigilator_id:
        for session in overlapping.filter(invigilator_id=invigilator_id):
            conflicts.append(
                {
                    "type": "invigilator",
                    "message": f"Invigilator already assigned to {session.course.code}",
                    "session_id": session.id,
                }
            )

    if course_id:
        student_ids = set(
            CourseEnrollment.objects.filter(
                course_id=course_id, status=CourseEnrollment.STATUS_ACTIVE
            ).values_list("student_id", flat=True)
        )
        if student_ids:
            for session in overlapping.exclude(course_id=course_id):
                clashing = CourseEnrollment.objects.filter(
                    course_id=session.course_id,
                    status=CourseEnrollment.STATUS_ACTIVE,
                    student_id__in=student_ids,
                ).count()
                if clashing:
                    conflicts.append(
                        {
                            "type": "student",
                            "message": f"{clashing} enrolled student(s) also have {session.course.code} at this time",
                            "session_id": session.id,
                        }
                    )

    return conflicts


def sessions_for_student(student, start=None, end=None):
    """Scheduled sessions for the courses a student is actively enrolled in."""
    course_ids = CourseEnrollment.objects.filter(
        student=student, status=CourseEnrollment.STATUS_ACTIVE
    ).values_list("course_id", flat=True)
    queryset = ScheduledSession.objects.filter(course_id__in=course_ids).select_related("course", "hall")
    if start:
        queryset = queryset.filter(ends_at__gte=start)
    if end:
        queryset = queryset.filter(starts_at__lte=end)
    return queryset


# ---------------------------------------------------------------------------
# Legacy per-student agenda + reminders (kept for existing endpoints)
# ---------------------------------------------------------------------------

def agenda_for_student(student):
    class_items = [
        {
            "id": item.id,
            "type": "class",
            "course": item.course.code,
            "title": item.course.title,
            "location": item.hall.name,
            "startsAt": item.starts_at.isoformat(),
            "endsAt": item.ends_at.isoformat(),
        }
        for item in ClassSchedule.objects.filter(student=student).select_related("course", "hall")
    ]
    exam_items = [
        {
            "id": item.id,
            "type": "exam",
            "course": item.course.code,
            "title": item.course.title,
            "location": item.hall.name,
            "startsAt": item.starts_at.isoformat(),
            "endsAt": item.ends_at.isoformat(),
        }
        for item in ExamSchedule.objects.filter(student=student).select_related("course", "hall")
    ]
    return sorted(class_items + exam_items, key=lambda item: item["startsAt"])


def generate_due_notifications(now=None):
    now = now or timezone.now()
    created = []

    for rule in ReminderRule.objects.filter(active=True):
        schedule_model = ClassSchedule if rule.event_type == ReminderRule.EVENT_CLASS else ExamSchedule
        for schedule in schedule_model.objects.select_related("student", "student__user", "course"):
            scheduled_for = schedule.starts_at - timezone.timedelta(minutes=rule.minutes_before)
            if scheduled_for > now:
                continue
            key = f"{rule.event_type}:{schedule.id}:{rule.channel}:{rule.minutes_before}:{schedule.student_id}"
            notification, was_created = NotificationEvent.objects.get_or_create(
                idempotency_key=key,
                defaults={
                    "recipient": schedule.student.user,
                    "student": schedule.student,
                    "event_type": rule.event_type,
                    "schedule_id": schedule.id,
                    "channel": rule.channel,
                    "scheduled_for": scheduled_for,
                    "delivery_state": NotificationEvent.STATE_DELIVERED,
                },
            )
            if was_created:
                created.append(notification)

    return created
