from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from sightline.models import (
    AcademicRecordImport,
    AlertEvent,
    AssessmentRecord,
    AttendanceRecord,
    Camera,
    ClassSchedule,
    Course,
    CourseEnrollment,
    Department,
    EvidenceAsset,
    ExamSchedule,
    ExamSession,
    FacultyProfile,
    Hall,
    NotificationEvent,
    OperationalHealth,
    ReminderRule,
    ReviewerAction,
    Seat,
    Semester,
    StudentProfile,
    UserProfile,
)
from sightline.services import calculate_risk_run, generate_due_notifications


class Command(BaseCommand):
    help = "Seed Sightline with phase-1 demo data."

    def handle(self, *args, **options):
        now = timezone.now()

        cse, _ = Department.objects.get_or_create(code="CSE", defaults={"name": "Computer Science and Engineering"})
        eee, _ = Department.objects.get_or_create(code="EEE", defaults={"name": "Electrical and Electronic Engineering"})
        semester, _ = Semester.objects.get_or_create(
            name="Spring 2026",
            defaults={"starts_on": now.date().replace(month=1, day=15), "ends_on": now.date().replace(month=5, day=30)},
        )
        algorithms, _ = Course.objects.get_or_create(
            semester=semester,
            code="CSE-321",
            defaults={"department": cse, "title": "Algorithms"},
        )
        databases, _ = Course.objects.get_or_create(
            semester=semester,
            code="CSE-335",
            defaults={"department": cse, "title": "Database Systems"},
        )
        circuits, _ = Course.objects.get_or_create(
            semester=semester,
            code="EEE-210",
            defaults={"department": eee, "title": "Circuit Analysis"},
        )

        user_specs = [
            ("admin", "Asha", "Admin", UserProfile.ROLE_ADMIN),
            ("invigilator", "Ira", "Invigilator", UserProfile.ROLE_INVIGILATOR),
            ("invigilator2", "Imran", "Invigilator", UserProfile.ROLE_INVIGILATOR),
            ("invigilator3", "Iffat", "Invigilator", UserProfile.ROLE_INVIGILATOR),
            ("teacher", "Tania", "Teacher", UserProfile.ROLE_TEACHER),
            ("teacher2", "Tanvir", "Teacher", UserProfile.ROLE_TEACHER),
            ("teacher3", "Tahmina", "Teacher", UserProfile.ROLE_TEACHER),
            ("teacher4", "Tareq", "Teacher", UserProfile.ROLE_TEACHER),
            ("teacher5", "Tasnim", "Teacher", UserProfile.ROLE_TEACHER),
        ]
        user_specs.extend(
            [
                (
                    "student" if index == 1 else f"student{index:02d}",
                    first_name,
                    "Student",
                    UserProfile.ROLE_STUDENT,
                )
                for index, first_name in enumerate(
                    [
                        "Samir",
                        "Nadia",
                        "Kabir",
                        "Meera",
                        "Rafi",
                        "Ayesha",
                        "Sadia",
                        "Hasan",
                        "Mitu",
                        "Robin",
                        "Nusrat",
                        "Fahim",
                        "Joya",
                        "Arif",
                        "Maliha",
                        "Rupa",
                        "Sakib",
                        "Farhan",
                        "Lamia",
                        "Sohan",
                    ],
                    start=1,
                )
            ]
        )
        desired_usernames = {username for username, *_ in user_specs}
        User.objects.filter(email__endswith="@sightline.local").exclude(username__in=desired_usernames).delete()

        users = {
            username: self.user(username, first_name, last_name, role, cse)
            for username, first_name, last_name, role in user_specs
        }
        for username in ["teacher", "teacher2", "teacher3", "teacher4", "teacher5"]:
            user = users[username]
            FacultyProfile.objects.update_or_create(
                user=user,
                defaults={"department": cse, "full_name": user.get_full_name() or user.username},
            )

        course_teacher_pairs = [
            (algorithms, users["teacher"]),
            (databases, users["teacher2"]),
            (circuits, users["teacher3"]),
        ]
        for course, teacher in course_teacher_pairs:
            course.teacher = teacher
            course.save(update_fields=["teacher", "updated_at"])

        hall_a, _ = Hall.objects.get_or_create(name="Hall A", defaults={"building": "Academic Block", "capacity": 96})
        hall_b, _ = Hall.objects.get_or_create(name="Hall B", defaults={"building": "Engineering Annex", "capacity": 64})
        for label in ["A1", "A2", "A3", "B1", "B2", "B3"]:
            Seat.objects.get_or_create(hall=hall_a, label=label, defaults={"region": f"Desk cluster {label[0]}"})
        for label in ["C1", "C2", "C3"]:
            Seat.objects.get_or_create(hall=hall_b, label=label, defaults={"region": "North row"})

        cam_a1, _ = Camera.objects.get_or_create(
            hall=hall_a,
            name="Uploaded Exam Video",
            defaults={
                "stream_url": "file://demo/hall-a-upload.mp4",
                "status": Camera.STATUS_ACTIVE,
                "last_health_message": "Demo video ready",
                "last_seen_at": now,
            },
        )
        Camera.objects.get_or_create(
            hall=hall_a,
            name="Backup Demo Video",
            defaults={
                "stream_url": "file://demo/hall-a-backup.mp4",
                "status": Camera.STATUS_DEGRADED,
                "last_health_message": "Demo analysis intentionally marked degraded",
                "last_seen_at": now - timezone.timedelta(minutes=6),
            },
        )
        Camera.objects.get_or_create(
            hall=hall_b,
            name="Uploaded Exam Video B",
            defaults={
                "stream_url": "file://demo/hall-b-upload.mp4",
                "status": Camera.STATUS_ACTIVE,
                "last_health_message": "Demo video ready",
                "last_seen_at": now,
            },
        )

        live_exam, _ = ExamSession.objects.get_or_create(
            course=algorithms,
            hall=hall_a,
            starts_at=now - timezone.timedelta(minutes=20),
            defaults={"ends_at": now + timezone.timedelta(minutes=100), "status": ExamSession.STATUS_LIVE},
        )
        live_exam.quiz_title = "Secure Browser Demo Quiz"
        live_exam.quiz_instructions = "Answer each question and submit the monitored attempt."
        live_exam.quiz_questions = [
            {
                "id": "q1",
                "kind": "single_choice",
                "prompt": "Which browser API can detect whether the quiz tab is no longer visible?",
                "options": ["Clipboard API", "Tab Visibility API", "Notification API", "Web Speech API"],
            },
            {
                "id": "q2",
                "kind": "single_choice",
                "prompt": "Which monitoring cadence does this ProcBot demo use?",
                "options": [
                    "Tab switch realtime, face every 5 seconds, phone every 17 seconds",
                    "Everything runs every 1 second",
                    "Face and phone detection run only on submit",
                    "Manual instructor review only",
                ],
            },
            {
                "id": "q3",
                "kind": "single_choice",
                "prompt": "A webcam sample reports zero faces for several checks. Which anomaly should be classified?",
                "options": ["TabSwitch", "MultiPerson", "FaceGone", "NetworkIdle"],
            },
            {
                "id": "q4",
                "kind": "short_answer",
                "prompt": "Describe why evidence screenshots help an instructor review alerts.",
            },
        ]
        live_exam.save(update_fields=["quiz_title", "quiz_instructions", "quiz_questions", "updated_at"])
        database_exam, _ = ExamSession.objects.get_or_create(
            course=databases,
            hall=hall_b,
            starts_at=now + timezone.timedelta(days=2),
            defaults={"ends_at": now + timezone.timedelta(days=2, hours=2), "status": ExamSession.STATUS_PREPARED},
        )
        database_exam.quiz_title = "Database Systems Quiz"
        database_exam.quiz_instructions = "Teacher-created sample quiz for enrolled students."
        database_exam.quiz_questions = [
            {
                "id": "q1",
                "kind": "single_choice",
                "prompt": "Which SQL clause filters grouped rows after aggregation?",
                "options": ["WHERE", "HAVING", "ORDER BY", "JOIN"],
            },
            {
                "id": "q2",
                "kind": "short_answer",
                "prompt": "Explain one reason database indexes can improve query performance.",
            },
        ]
        database_exam.save(update_fields=["quiz_title", "quiz_instructions", "quiz_questions", "updated_at"])

        student_rows = []
        for index in range(1, 21):
            username = "student" if index == 1 else f"student{index:02d}"
            first_name = users[username].first_name
            student_rows.append(
                (
                    f"S-{1000 + index}",
                    f"{first_name} Student",
                    "2023-CSE-A" if index <= 10 else "2023-CSE-B",
                    users[username],
                    12 + (index * 3) % 13,
                    24,
                    Decimal(str(35 + (index * 7) % 55)),
                    Decimal("100"),
                )
            )
        students = []
        for number, name, cohort, user, *_ in student_rows:
            student, _ = StudentProfile.objects.update_or_create(
                student_number=number,
                defaults={"user": user, "department": cse, "full_name": name, "cohort": cohort},
            )
            students.append(student)
            CourseEnrollment.objects.update_or_create(
                course=algorithms,
                student=student,
                defaults={"status": CourseEnrollment.STATUS_ACTIVE},
            )

        source_import, _ = AcademicRecordImport.objects.get_or_create(
            semester=semester,
            source_name="spring-2026-week-8-sample.csv",
            defaults={"uploaded_by": users["teacher"], "status": AcademicRecordImport.STATUS_VALIDATED, "imported_rows": 4},
        )
        if not AttendanceRecord.objects.filter(source_import=source_import).exists():
            for number, _name, _cohort, _user, attended, total, score, max_score in student_rows:
                student = StudentProfile.objects.get(student_number=number)
                AttendanceRecord.objects.create(
                    source_import=source_import,
                    student=student,
                    course=algorithms,
                    attended=attended,
                    total=total,
                )
                AssessmentRecord.objects.create(
                    source_import=source_import,
                    student=student,
                    course=algorithms,
                    label="Midterm",
                    score=score,
                    max_score=max_score,
                )
            calculate_risk_run(source_import, algorithms)

        if not AlertEvent.objects.exists():
            alert = AlertEvent.objects.create(
                exam_session=live_exam,
                camera=cam_a1,
                seat=Seat.objects.get(hall=hall_a, label="A2"),
                alert_type=AlertEvent.TYPE_LOOK_AWAY,
                occurred_at=now - timezone.timedelta(minutes=3),
                window_started_at=now - timezone.timedelta(minutes=4),
                window_ended_at=now - timezone.timedelta(minutes=3),
                confidence_score=Decimal("0.81"),
                visibility_quality="clear",
                status=AlertEvent.STATUS_VISIBLE,
                summary="Repeated look-away pattern over a sustained interval.",
            )
            EvidenceAsset.objects.create(
                alert=alert,
                kind=EvidenceAsset.KIND_SNAPSHOT,
                uri="evidence://demo/look-away-snapshot",
                captured_at=alert.occurred_at,
                quality_note="Seat and head pose are visible",
            )
            dismissed = AlertEvent.objects.create(
                exam_session=live_exam,
                camera=cam_a1,
                seat=Seat.objects.get(hall=hall_a, label="A3"),
                alert_type=AlertEvent.TYPE_NEIGHBORING_DESK,
                occurred_at=now - timezone.timedelta(minutes=16),
                window_started_at=now - timezone.timedelta(minutes=17),
                window_ended_at=now - timezone.timedelta(minutes=16),
                confidence_score=Decimal("0.74"),
                visibility_quality="partially occluded",
                status=AlertEvent.STATUS_DISMISSED,
                summary="Side glance toward neighboring desk; reviewer found it transient.",
            )
            EvidenceAsset.objects.create(
                alert=dismissed,
                kind=EvidenceAsset.KIND_CLIP,
                uri="evidence://demo/neighboring-desk-clip",
                captured_at=dismissed.occurred_at,
                quality_note="Short clip retained for audit",
            )
            ReviewerAction.objects.create(
                alert=dismissed,
                reviewer=users["invigilator"],
                decision=ReviewerAction.DECISION_DISMISSED,
                note="Likely responding to dropped pencil; no further action.",
            )

        if not ClassSchedule.objects.exists():
            for offset, course in [(1, algorithms), (2, databases), (3, circuits)]:
                for student in students[:3]:
                    ClassSchedule.objects.create(
                        course=course,
                        student=student,
                        hall=hall_a if course != circuits else hall_b,
                        starts_at=now + timezone.timedelta(hours=offset * 4),
                        ends_at=now + timezone.timedelta(hours=offset * 4 + 1, minutes=20),
                    )
            for student in students[:3]:
                ExamSchedule.objects.create(
                    course=algorithms,
                    student=student,
                    hall=hall_a,
                    starts_at=now + timezone.timedelta(days=1, hours=2),
                    ends_at=now + timezone.timedelta(days=1, hours=4),
                )

        ReminderRule.objects.get_or_create(event_type=ReminderRule.EVENT_CLASS, channel=ReminderRule.CHANNEL_IN_APP, minutes_before=240)
        ReminderRule.objects.get_or_create(event_type=ReminderRule.EVENT_EXAM, channel=ReminderRule.CHANNEL_EMAIL, minutes_before=1440)
        generate_due_notifications(now + timezone.timedelta(days=2))

        OperationalHealth.objects.update_or_create(
            kind=OperationalHealth.KIND_INFERENCE,
            component="inference-worker-demo",
            defaults={"state": OperationalHealth.STATE_HEALTHY, "message": "Worker heartbeat received", "last_checked_at": now},
        )
        OperationalHealth.objects.update_or_create(
            kind=OperationalHealth.KIND_IMPORT,
            component="academic-imports",
            defaults={"state": OperationalHealth.STATE_HEALTHY, "message": "Latest import validated", "last_checked_at": now},
        )
        OperationalHealth.objects.update_or_create(
            kind=OperationalHealth.KIND_REMINDER,
            component="reminder-generation",
            defaults={"state": OperationalHealth.STATE_HEALTHY, "message": "Idempotent reminders generated", "last_checked_at": now},
        )
        for camera in Camera.objects.select_related("hall"):
            OperationalHealth.objects.update_or_create(
                kind=OperationalHealth.KIND_CAMERA,
                component=f"{camera.hall.name} / {camera.name}",
                defaults={
                    "state": OperationalHealth.STATE_DEGRADED
                    if camera.status == Camera.STATUS_DEGRADED
                    else OperationalHealth.STATE_HEALTHY,
                    "message": camera.last_health_message,
                    "last_checked_at": camera.last_seen_at or now,
                },
            )

        role_counts = {
            role: UserProfile.objects.filter(role=role).count()
            for role in [
                UserProfile.ROLE_ADMIN,
                UserProfile.ROLE_INVIGILATOR,
                UserProfile.ROLE_TEACHER,
                UserProfile.ROLE_STUDENT,
            ]
        }
        self.stdout.write(
            self.style.SUCCESS(
                "Sightline demo data is ready: "
                f"{role_counts[UserProfile.ROLE_ADMIN]} admin, "
                f"{role_counts[UserProfile.ROLE_INVIGILATOR]} invigilators, "
                f"{role_counts[UserProfile.ROLE_TEACHER]} teachers, "
                f"{role_counts[UserProfile.ROLE_STUDENT]} students."
            )
        )

    def user(self, username, first_name, last_name, role, department):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "email": f"{username}@sightline.local",
            },
        )
        if created:
            user.set_password("sightline")
        user.first_name = first_name
        user.last_name = last_name
        user.email = f"{username}@sightline.local"
        user.is_staff = role == UserProfile.ROLE_ADMIN
        user.is_superuser = role == UserProfile.ROLE_ADMIN
        user.save()
        UserProfile.objects.update_or_create(user=user, defaults={"role": role, "department": department})
        return user
