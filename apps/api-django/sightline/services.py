from decimal import Decimal

from django.db.models import Avg, Count
from django.utils import timezone

from .models import (
    AssessmentRecord,
    AttendanceRecord,
    ClassSchedule,
    ExamSchedule,
    NotificationEvent,
    ReminderRule,
    RiskAssessmentRun,
    StudentRiskScore,
)


def calculate_risk_run(source_import, course):
    run = RiskAssessmentRun.objects.create(
        semester=source_import.semester,
        course=course,
        source_import=source_import,
        status=RiskAssessmentRun.STATUS_COMPLETED,
    )

    student_ids = set(
        AttendanceRecord.objects.filter(source_import=source_import, course=course).values_list("student_id", flat=True)
    )
    student_ids.update(
        AssessmentRecord.objects.filter(source_import=source_import, course=course).values_list("student_id", flat=True)
    )

    for student_id in student_ids:
        attendance = AttendanceRecord.objects.filter(
            source_import=source_import, course=course, student_id=student_id
        ).first()
        assessment_stats = AssessmentRecord.objects.filter(
            source_import=source_import, course=course, student_id=student_id
        ).aggregate(avg_score=Avg("score"), avg_max=Avg("max_score"), count=Count("id"))

        factors = []
        risk_score = 0

        if attendance:
            attendance_rate = attendance.rate
            if attendance_rate < 75:
                risk_score += 35
                factors.append(f"Attendance is {attendance_rate}%")
            elif attendance_rate < 85:
                risk_score += 15
                factors.append(f"Attendance is borderline at {attendance_rate}%")

        if assessment_stats["count"]:
            avg_max = assessment_stats["avg_max"] or Decimal("1")
            score_rate = round(float((assessment_stats["avg_score"] / avg_max) * 100), 1)
            if score_rate < 50:
                risk_score += 45
                factors.append(f"Assessment average is {score_rate}%")
            elif score_rate < 65:
                risk_score += 25
                factors.append(f"Assessment average is {score_rate}%")
        else:
            risk_score += 20
            factors.append("No assessment records available")

        if not factors:
            factors.append("No immediate risk factors detected")

        risk_level = StudentRiskScore.LEVEL_LOW
        if risk_score >= 60:
            risk_level = StudentRiskScore.LEVEL_HIGH
        elif risk_score >= 30:
            risk_level = StudentRiskScore.LEVEL_MEDIUM

        StudentRiskScore.objects.create(
            run=run,
            student_id=student_id,
            course=course,
            risk_level=risk_level,
            risk_score=min(risk_score, 100),
            contributing_factors=factors,
        )

    return run


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

