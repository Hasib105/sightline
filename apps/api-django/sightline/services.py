import logging
import math
import random

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db.models import Sum
from django.utils import timezone

from . import predict
from .models import (
    AcademicRecordImport,
    AssessmentRecord,
    AttendanceRecord,
    ClassSchedule,
    Course,
    CourseEnrollment,
    ExamSchedule,
    FacultyActionLog,
    Hall,
    NotificationEvent,
    ReminderRule,
    RiskAssessmentRun,
    ScheduledSession,
    StudentProfile,
    StudentRiskScore,
    UserProfile,
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
        else:
            quizzes.append(ratio)

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

def course_for_import(import_id, user, admin=False):
    queryset = AttendanceRecord.objects.filter(source_import_id=import_id).select_related("course")
    if not admin and user:
        owned = queryset.filter(course__teacher=user)
        if owned.exists():
            return owned.first().course
        record = queryset.first()
        return record.course if record else None
    record = queryset.first()
    return record.course if record else None


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

# Campus hours: 08:00–16:00 by default. Friday + Saturday are typical weekend days.
SCHEDULE_START_HOUR = 8
SCHEDULE_END_HOUR = 16
CAMPUS_TIMEZONE = ZoneInfo("Asia/Dhaka")
DEFAULT_WEEKEND_DAYS = (4, 5)  # Friday, Saturday
DEFAULT_TEACHING_WEEKDAYS = (0, 1, 2, 3)  # Monday–Thursday
ACADEMIC_HOLIDAYS = [
    date(2026, 2, 21),
    date(2026, 3, 26),
    date(2026, 4, 14),
    date(2026, 5, 1),
    date(2026, 12, 16),
]


def resolve_course_for_risk(user, admin=False, student_numbers=None):
    """Pick the best course for a teacher CSV run without manual selection."""
    student_numbers = [str(value).strip() for value in (student_numbers or []) if value]

    if admin:
        queryset = Course.objects.all()
    elif user:
        queryset = Course.objects.filter(teacher=user)
        if not queryset.exists() and student_numbers:
            queryset = Course.objects.filter(
                enrollments__student__student_number__in=student_numbers,
                enrollments__status=CourseEnrollment.STATUS_ACTIVE,
            ).distinct()
        if not queryset.exists():
            queryset = Course.objects.filter(code="CSE-321")
    else:
        return None

    if student_numbers:
        best_course = None
        best_count = -1
        for course in queryset.order_by("code"):
            match_count = CourseEnrollment.objects.filter(
                course=course,
                student__student_number__in=student_numbers,
                status=CourseEnrollment.STATUS_ACTIVE,
            ).count()
            if match_count > best_count:
                best_count = match_count
                best_course = course
        if best_course and best_count > 0:
            return best_course

    return queryset.order_by("code").first()


def default_course_for_risk(user, admin=False, student_numbers=None):
    return resolve_course_for_risk(user, admin=admin, student_numbers=student_numbers)


def reset_course_risk_data(course):
    """Clear saved risk runs and import rows for a course so teachers can re-upload."""
    run_import_ids = set(
        RiskAssessmentRun.objects.filter(course=course).values_list("source_import_id", flat=True)
    )
    score_count = StudentRiskScore.objects.filter(course=course).count()
    StudentRiskScore.objects.filter(course=course).delete()
    RiskAssessmentRun.objects.filter(course=course).delete()
    AttendanceRecord.objects.filter(course=course).delete()
    AssessmentRecord.objects.filter(course=course).delete()
    for import_id in run_import_ids:
        record_import = AcademicRecordImport.objects.filter(id=import_id).first()
        if not record_import:
            continue
        has_rows = AttendanceRecord.objects.filter(source_import=record_import).exists()
        has_rows = has_rows or AssessmentRecord.objects.filter(source_import=record_import).exists()
        if not has_rows:
            record_import.delete()
    return score_count


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


def _class_slot_starts(day_start_hour, day_end_hour, duration_minutes, gap_minutes=15):
    """Build start times that fit class duration inside campus hours."""
    slots = []
    cursor = day_start_hour * 60
    end_limit = day_end_hour * 60
    while cursor + duration_minutes <= end_limit:
        slots.append((cursor // 60, cursor % 60))
        cursor += duration_minutes + gap_minutes
    return slots


EXAM_DURATION_MINUTES = 120


def _semester_week_starts(term_start, term_end):
    """Monday-aligned week starts overlapping the teaching term."""
    if not term_start or not term_end or term_end < term_start:
        return []
    cursor = term_start - timedelta(days=term_start.weekday())
    weeks = []
    while cursor <= term_end:
        weeks.append(cursor)
        cursor += timedelta(days=7)
    return weeks


def _slot_duration_minutes(kind, class_duration_minutes):
    if kind == ScheduledSession.KIND_EXAM:
        return EXAM_DURATION_MINUTES
    return class_duration_minutes


def _session_duration(kind, class_duration_minutes):
    return timedelta(minutes=_slot_duration_minutes(kind, class_duration_minutes))


def _campus_datetime(day_date, hour, minute):
    return datetime.combine(day_date, time(hour, minute), tzinfo=CAMPUS_TIMEZONE)


def _fits_campus_hours(starts_at, ends_at, day_end_hour):
    end_local = ends_at.astimezone(CAMPUS_TIMEZONE)
    limit = day_end_hour * 60
    end_minutes = end_local.hour * 60 + end_local.minute
    return end_minutes <= limit


class _ScheduleOccupancy:
    """Track hall and invigilator usage within a single generate run."""

    def __init__(self):
        self._blocks = []

    @staticmethod
    def _overlaps(start_a, end_a, start_b, end_b):
        return start_a < end_b and end_a > start_b

    def room_busy(self, hall_id, starts_at, ends_at):
        return any(
            hall_id == hall and self._overlaps(starts_at, ends_at, start, end)
            for hall, start, end, _inv in self._blocks
        )

    def invigilator_busy(self, invigilator_id, starts_at, ends_at):
        if not invigilator_id:
            return False
        return any(
            invigilator_id == inv and self._overlaps(starts_at, ends_at, start, end)
            for _hall, start, end, inv in self._blocks
        )

    def reserve(self, hall_id, starts_at, ends_at, invigilator_id=None):
        self._blocks.append((hall_id, starts_at, ends_at, invigilator_id))


def _all_term_teaching_days(
    week_starts,
    teaching_weekdays,
    weekend_days,
    holidays,
    term_start,
    term_end,
):
    seen = set()
    days = []
    for week_start_date in week_starts:
        for _offset, day_date, _weekday in _teaching_days_in_week(
            week_start_date,
            teaching_weekdays,
            weekend_days,
            holidays=holidays,
            term_start=term_start,
            term_end=term_end,
        ):
            if day_date in seen:
                continue
            seen.add(day_date)
            days.append(day_date)
    return sorted(days)


def _shuffled_indices(count, rng):
    indices = list(range(count))
    rng.shuffle(indices)
    return indices


def _score_placement(occupancy, hall, starts_at, ends_at, invigilator_id, course_id):
    if occupancy.room_busy(hall.id, starts_at, ends_at):
        return None
    if occupancy.invigilator_busy(invigilator_id, starts_at, ends_at):
        return None
    conflicts = scheduling_conflicts(
        hall.id,
        starts_at,
        ends_at,
        invigilator_id=invigilator_id,
        course_id=course_id,
    )
    return len(conflicts), conflicts


def _place_best_session(
    suggestions,
    occupancy,
    *,
    kind,
    course,
    halls,
    hall_order,
    slot_times,
    slot_order,
    day_candidates,
    duration,
    day_end_hour,
    invigilator_id,
    session_index,
    conflict_budget,
    optimize_conflicts,
    rng,
):
    ranked = []
    for day_date in day_candidates:
        for slot_idx in slot_order:
            hour, minute = slot_times[slot_idx]
            starts_at = _campus_datetime(day_date, hour, minute)
            ends_at = starts_at + duration
            if not _fits_campus_hours(starts_at, ends_at, day_end_hour):
                continue
            for hall_idx in hall_order:
                hall = halls[hall_idx]
                scored = _score_placement(occupancy, hall, starts_at, ends_at, invigilator_id, course.id)
                if scored is None:
                    continue
                conflict_count, conflicts = scored
                ranked.append(
                    (conflict_count, day_date, hall, starts_at, ends_at, invigilator_id, conflicts, slot_idx, hall_idx)
                )

    if not ranked:
        return False

    ranked.sort(key=lambda item: (item[0], rng.random()))
    clean = [item for item in ranked if item[0] == 0]

    if optimize_conflicts:
        if clean:
            pick = rng.choice(clean) if len(clean) > 1 else clean[0]
        elif conflict_budget[0] > 0:
            pick = ranked[0]
            conflict_budget[0] -= 1
        else:
            return False
    else:
        if not clean:
            return False
        pick = rng.choice(clean) if len(clean) > 1 else clean[0]

    conflict_count, _day_date, hall, starts_at, ends_at, invigilator_id, conflicts, _slot_idx, _hall_idx = pick
    occupancy.reserve(hall.id, starts_at, ends_at, invigilator_id)
    label = "Exam" if kind == ScheduledSession.KIND_EXAM else f"Class {session_index + 1}"
    suggestions.append(
        {
            "kind": kind,
            "course": course.id,
            "course_code": course.code,
            "course_title": course.title,
            "hall": hall.id,
            "hall_name": hall.name,
            "invigilator": invigilator_id,
            "title": f"{course.code} {label}",
            "starts_at": starts_at,
            "ends_at": ends_at,
            "conflicts": conflicts if conflict_count else [],
        }
    )
    return True


def _teaching_days_in_week(
    week_start_date,
    teaching_weekdays,
    weekend_days,
    holidays=None,
    term_start=None,
    term_end=None,
):
    teaching = set(teaching_weekdays or DEFAULT_TEACHING_WEEKDAYS)
    weekend = set(weekend_days or DEFAULT_WEEKEND_DAYS)
    holiday_set = set(holidays or ACADEMIC_HOLIDAYS)
    days = []
    for offset in range(7):
        day_date = week_start_date + timedelta(days=offset)
        weekday = day_date.weekday()
        if weekday in weekend or weekday not in teaching:
            continue
        if day_date in holiday_set:
            continue
        if term_start and day_date < term_start:
            continue
        if term_end and day_date > term_end:
            continue
        days.append((offset, day_date, weekday))
    return days


def generate_schedule_plan(
    course_ids,
    week_start=None,
    kind=ScheduledSession.KIND_CLASS,
    teaching_weekdays=None,
    weekend_days=None,
    holidays=None,
    day_start_hour=SCHEDULE_START_HOUR,
    day_end_hour=SCHEDULE_END_HOUR,
    class_duration_minutes=90,
    classes_per_week=3,
    term_start=None,
    term_end=None,
    optimize_conflicts=True,
    max_conflict_ratio=0.05,
    shuffle_seed=None,
):
    """Plan class sessions across the semester with shuffled placement and overlap control."""
    courses = list(Course.objects.filter(id__in=course_ids).order_by("code"))
    halls = list(Hall.objects.order_by("name"))
    invigilators = list(
        User.objects.filter(sightline_profile__role=UserProfile.ROLE_INVIGILATOR).order_by("username")
    )
    if not courses or not halls:
        return {"suggestions": [], "stats": {"total": 0, "conflict_free": 0, "with_conflicts": 0, "skipped": 0}}

    rng = random.Random(shuffle_seed if shuffle_seed is not None else random.randint(1, 2_147_483_647))
    rng.shuffle(courses)

    teaching_weekdays_list = list(teaching_weekdays or DEFAULT_TEACHING_WEEKDAYS)
    weekend_days_list = list(weekend_days or DEFAULT_WEEKEND_DAYS)
    holiday_set = holidays or ACADEMIC_HOLIDAYS

    if week_start:
        week_start_date = week_start.date() if isinstance(week_start, datetime) else week_start
        week_starts = [week_start_date]
    elif term_start and term_end:
        term_start_date = term_start.date() if isinstance(term_start, datetime) else term_start
        term_end_date = term_end.date() if isinstance(term_end, datetime) else term_end
        week_starts = _semester_week_starts(term_start_date, term_end_date)
    else:
        return {"suggestions": [], "stats": {"total": 0, "conflict_free": 0, "with_conflicts": 0, "skipped": 0}}

    if not week_starts:
        return {"suggestions": [], "stats": {"total": 0, "conflict_free": 0, "with_conflicts": 0, "skipped": 0}}

    duration = _session_duration(kind, class_duration_minutes)
    slot_times = _class_slot_starts(
        day_start_hour,
        day_end_hour,
        _slot_duration_minutes(kind, class_duration_minutes),
    )
    if not slot_times:
        return {"suggestions": [], "stats": {"total": 0, "conflict_free": 0, "with_conflicts": 0, "skipped": 0}}

    all_term_days = _all_term_teaching_days(
        week_starts,
        teaching_weekdays_list,
        weekend_days_list,
        holiday_set,
        term_start,
        term_end,
    )

    if kind == ScheduledSession.KIND_EXAM:
        sessions_target = len(courses)
    else:
        avg_teaching_days = max(
            len(
                _teaching_days_in_week(
                    week_starts[0],
                    teaching_weekdays_list,
                    weekend_days_list,
                    holidays=holiday_set,
                    term_start=term_start,
                    term_end=term_end,
                )
            ),
            1,
        )
        sessions_target = len(courses) * len(week_starts) * min(classes_per_week, avg_teaching_days)

    conflict_budget = [math.ceil(sessions_target * max_conflict_ratio)] if optimize_conflicts else [0]
    suggestions = []
    occupancy = _ScheduleOccupancy()
    skipped = 0

    for course_index, course in enumerate(courses):
        slot_order = _shuffled_indices(len(slot_times), rng)
        hall_order = _shuffled_indices(len(halls), rng)

        if kind == ScheduledSession.KIND_EXAM:
            rotated_weeks = week_starts[course_index % len(week_starts) :] + week_starts[: course_index % len(week_starts)]
            exam_days = []
            for week_start_date in rotated_weeks:
                exam_days.extend(
                    day
                    for _offset, day, _weekday in _teaching_days_in_week(
                        week_start_date,
                        teaching_weekdays_list,
                        weekend_days_list,
                        holidays=holiday_set,
                        term_start=term_start,
                        term_end=term_end,
                    )
                )
            day_candidates = list(dict.fromkeys(exam_days))
            rng.shuffle(day_candidates)
            day_candidates.extend([day for day in all_term_days if day not in set(day_candidates)])
            invigilator_id = invigilators[course_index % len(invigilators)].id if invigilators else None
            if not _place_best_session(
                suggestions,
                occupancy,
                kind=kind,
                course=course,
                halls=halls,
                hall_order=hall_order,
                slot_times=slot_times,
                slot_order=slot_order,
                day_candidates=day_candidates,
                duration=duration,
                day_end_hour=day_end_hour,
                invigilator_id=invigilator_id,
                session_index=0,
                conflict_budget=conflict_budget,
                optimize_conflicts=optimize_conflicts,
                rng=rng,
            ):
                skipped += 1
            continue

        week_indices = _shuffled_indices(len(week_starts), rng)
        for week_idx in week_indices:
            week_start_date = week_starts[week_idx]
            teaching_days = _teaching_days_in_week(
                week_start_date,
                teaching_weekdays_list,
                weekend_days_list,
                holidays=holiday_set,
                term_start=term_start,
                term_end=term_end,
            )
            if not teaching_days:
                continue

            sessions_needed = min(classes_per_week, len(teaching_days))
            week_day_dates = [day for _offset, day, _weekday in teaching_days]
            rng.shuffle(week_day_dates)

            for session_index in range(sessions_needed):
                day_rotation = (course_index * classes_per_week + week_idx + session_index) % max(len(week_day_dates), 1)
                preferred = [
                    week_day_dates[(day_rotation + attempt) % len(week_day_dates)] for attempt in range(len(week_day_dates))
                ]
                fallback = [day for day in all_term_days if day not in set(preferred)]
                rng.shuffle(fallback)
                day_candidates = list(dict.fromkeys(preferred + fallback))

                if not _place_best_session(
                    suggestions,
                    occupancy,
                    kind=kind,
                    course=course,
                    halls=halls,
                    hall_order=hall_order,
                    slot_times=slot_times,
                    slot_order=slot_order,
                    day_candidates=day_candidates,
                    duration=duration,
                    day_end_hour=day_end_hour,
                    invigilator_id=None,
                    session_index=session_index,
                    conflict_budget=conflict_budget,
                    optimize_conflicts=optimize_conflicts,
                    rng=rng,
                ):
                    skipped += 1

    suggestions.sort(key=lambda item: item["starts_at"])
    conflict_free = sum(1 for item in suggestions if not item.get("conflicts"))
    with_conflicts = len(suggestions) - conflict_free
    total = len(suggestions)
    return {
        "suggestions": suggestions,
        "stats": {
            "total": total,
            "conflict_free": conflict_free,
            "with_conflicts": with_conflicts,
            "skipped": skipped,
            "clean_ratio": round(conflict_free / total, 4) if total else 1.0,
            "conflict_budget": math.ceil(sessions_target * max_conflict_ratio) if optimize_conflicts else 0,
            "shuffle_seed": shuffle_seed,
        },
    }


def bulk_create_scheduled_sessions(request, session_items):
    """Create multiple scheduled sessions from validated dict payloads."""
    from django.utils.dateparse import parse_datetime

    from . import serializers as app_serializers

    created = []
    allowed_fields = {"kind", "course", "hall", "invigilator", "title", "starts_at", "ends_at"}
    for item in session_items:
        clean_item = {key: value for key, value in item.items() if key in allowed_fields}
        if clean_item.get("invigilator") in ("", None):
            clean_item["invigilator"] = None
        for field in ("starts_at", "ends_at"):
            if isinstance(clean_item.get(field), str):
                parsed = parse_datetime(clean_item[field])
                if parsed:
                    clean_item[field] = parsed
        session_serializer = app_serializers.ScheduledSessionSerializer(data=clean_item)
        session_serializer.is_valid(raise_exception=True)
        created.append(session_serializer.save())
    return created


def clear_scheduled_sessions(course_ids=None, teacher_user=None, admin=False):
    """Delete scheduled sessions, optionally limited to courses or a teacher's courses."""
    queryset = ScheduledSession.objects.all()
    if course_ids:
        queryset = queryset.filter(course_id__in=course_ids)
    if teacher_user and not admin:
        queryset = queryset.filter(course__teacher=teacher_user)
    deleted_count, _ = queryset.delete()
    return deleted_count


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
