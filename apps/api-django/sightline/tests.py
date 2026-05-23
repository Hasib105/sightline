from django.core.management import call_command
from django.test import Client, TestCase
from django.utils import timezone

from .models import Course, CourseMaterial, ExamAttempt, ExamSession, NotificationEvent, StudentRiskScore


class SightlineApiSmokeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_sightline", verbosity=0)

    def setUp(self):
        self.client = Client()

    def test_core_dashboards_load(self):
        for path in [
            "/api/overview/",
            "/api/personas/",
            "/api/integrity/alerts/",
            "/api/analytics/risk/",
            "/api/schedules/agenda/?studentNumber=S-1001",
            "/api/notifications/",
            "/api/operations/health/",
        ]:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)

    def test_alert_can_be_created_and_reviewed(self):
        response = self.client.post("/api/integrity/simulate-alert/", data={}, content_type="application/json")
        self.assertEqual(response.status_code, 201)
        alert_id = response.json()["alert"]["id"]

        response = self.client.post(
            f"/api/integrity/alerts/{alert_id}/review/",
            data={"decision": "confirmed", "reviewerUsername": "invigilator", "note": "Reviewed in test"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["alert"]["status"], "confirmed")

    def test_reminder_generation_is_idempotent(self):
        first = self.client.post("/api/notifications/generate/", data={}, content_type="application/json")
        second = self.client.post("/api/notifications/generate/", data={}, content_type="application/json")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()["created"], 0)
        self.assertEqual(NotificationEvent.objects.count(), NotificationEvent.objects.values("idempotency_key").distinct().count())

    def test_student_can_submit_enrolled_exam_and_update_attempt(self):
        self.assertTrue(self.client.login(username="student", password="sightline"))
        exam = ExamSession.objects.get(course__code="CSE-321")

        first = self.client.post(
            f"/api/v1/exams/{exam.id}/attempt",
            data={"answers": {"q1": "Tab Visibility API"}},
            content_type="application/json",
        )
        second = self.client.post(
            f"/api/v1/exams/{exam.id}/attempt",
            data={"answers": {"q1": "Updated answer"}},
            content_type="application/json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(ExamAttempt.objects.filter(exam_session=exam).count(), 1)
        self.assertEqual(ExamAttempt.objects.get(exam_session=exam).answers["q1"], "Updated answer")

    def test_student_cannot_submit_unenrolled_exam(self):
        self.assertTrue(self.client.login(username="student", password="sightline"))
        exam = ExamSession.objects.get(course__code="CSE-335")

        response = self.client.post(
            f"/api/v1/exams/{exam.id}/attempt",
            data={"answers": {"q1": "Tab Visibility API"}},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    def test_teacher_can_upload_course_material(self):
        self.assertTrue(self.client.login(username="teacher", password="sightline"))
        course = Course.objects.get(code="CSE-321")

        response = self.client.post(
            f"/api/v1/courses/{course.id}/materials",
            data={
                "kind": "slide",
                "title": "Week 2 Slides",
                "description": "Divide and conquer notes.",
                "uri": "file://demo/cse-321-week-2.pdf",
                "original_filename": "cse-321-week-2.pdf",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(CourseMaterial.objects.filter(course=course).count(), 1)

    def test_teacher_can_create_own_course_and_exam(self):
        self.assertTrue(self.client.login(username="teacher", password="sightline"))

        course_response = self.client.post(
            "/api/v1/courses",
            data={"code": "CSE-410", "title": "Software Engineering"},
            content_type="application/json",
        )
        self.assertEqual(course_response.status_code, 201)
        course = Course.objects.get(code="CSE-410")
        self.assertEqual(course.teacher.username, "teacher")

        starts_at = timezone.now() + timezone.timedelta(days=3)
        exam_response = self.client.post(
            "/api/v1/exams",
            data={
                "course": course.id,
                "starts_at": starts_at.isoformat(),
                "ends_at": (starts_at + timezone.timedelta(hours=2)).isoformat(),
                "status": "prepared",
                "quiz_title": "Software Engineering Quiz",
                "quiz_questions": [{"id": "q1", "kind": "short_answer", "prompt": "Define cohesion."}],
            },
            content_type="application/json",
        )

        self.assertEqual(exam_response.status_code, 201)
        self.assertEqual(ExamSession.objects.filter(course=course).count(), 1)

    def test_teacher_cannot_create_exam_for_another_teacher_course(self):
        self.assertTrue(self.client.login(username="teacher", password="sightline"))
        other_course = Course.objects.get(code="CSE-335")
        starts_at = timezone.now() + timezone.timedelta(days=4)

        response = self.client.post(
            "/api/v1/exams",
            data={
                "course": other_course.id,
                "starts_at": starts_at.isoformat(),
                "ends_at": (starts_at + timezone.timedelta(hours=2)).isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    def test_teacher_can_run_at_risk_analysis_for_own_course(self):
        self.assertTrue(self.client.login(username="teacher", password="sightline"))
        course = Course.objects.get(code="CSE-321")

        response = self.client.post(
            "/api/v1/at-risk",
            data={
                "course": course.id,
                "source_name": "teacher-test-risk.csv",
                "rows": [
                    {
                        "student_number": "S-1001",
                        "attended": 10,
                        "total": 24,
                        "score": 42,
                        "max_score": 100,
                    }
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.json()["scores"]), 1)
        self.assertTrue(StudentRiskScore.objects.filter(course=course, student__student_number="S-1001").exists())

    def test_teacher_cannot_run_at_risk_analysis_for_another_teacher_course(self):
        self.assertTrue(self.client.login(username="teacher", password="sightline"))
        other_course = Course.objects.get(code="CSE-335")

        response = self.client.post(
            "/api/v1/at-risk",
            data={
                "course": other_course.id,
                "source_name": "blocked-risk.csv",
                "rows": [{"student_number": "S-1001", "attended": 10, "total": 24, "score": 42, "max_score": 100}],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
