import os
from contextlib import nullcontext
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from .exam_detection.config import CFG
from .course_rag import retrieve_course_context
from .models import (
    Course,
    CourseEnrollment,
    CourseChatMessage,
    CourseChatThread,
    CourseMaterial,
    CourseUnit,
    ExamAttempt,
    ExamSession,
    ExamVideo,
    ExamVideoAnalysisResult,
    NotificationEvent,
    StudentRiskScore,
)
from .tasks import index_course_material_task


class SightlineApiSmokeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_sightline", verbosity=0)

    def setUp(self):
        self.client = Client()
        self.temp_dir = TemporaryDirectory(ignore_cleanup_errors=True)
        self.addCleanup(self.temp_dir.cleanup)
        self.media_settings = override_settings(MEDIA_ROOT=Path(self.temp_dir.name) / "media")
        self.media_settings.enable()
        self.addCleanup(self.media_settings.disable)
        self.env_patch = patch.dict(
            os.environ,
            {
                "SIGHTLINE_QDRANT_PATH": str(Path(self.temp_dir.name) / "qdrant"),
                "SIGHTLINE_CHAT_CHECKPOINT_PATH": str(Path(self.temp_dir.name) / "checkpoints.sqlite3"),
            },
        )
        self.env_patch.start()
        self.addCleanup(self.env_patch.stop)

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

    def test_student_sees_exams_only_for_active_course_enrollments(self):
        self.assertTrue(self.client.login(username="student", password="sightline"))
        enrolled_exam = ExamSession.objects.get(course__code="CSE-321")
        unenrolled_exam = ExamSession.objects.get(course__code="CSE-335")

        response = self.client.get("/api/v1/exams")

        self.assertEqual(response.status_code, 200)
        exam_ids = [exam["id"] for exam in response.json()]
        self.assertIn(enrolled_exam.id, exam_ids)
        self.assertNotIn(unenrolled_exam.id, exam_ids)

        enrollment = CourseEnrollment.objects.get(course=enrolled_exam.course, student__user__username="student")
        enrollment.status = CourseEnrollment.STATUS_DROPPED
        enrollment.save(update_fields=["status", "updated_at"])

        response = self.client.get("/api/v1/exams")

        self.assertEqual(response.status_code, 200)
        self.assertNotIn(enrolled_exam.id, [exam["id"] for exam in response.json()])

    @patch("sightline.views.queue_course_material_index")
    def test_teacher_can_upload_course_material(self, queue_course_material_index):
        self.assertTrue(self.client.login(username="teacher", password="sightline"))
        course = Course.objects.get(code="CSE-321")
        existing_materials = CourseMaterial.objects.filter(course=course).count()

        with self.captureOnCommitCallbacks(execute=True):
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
        self.assertEqual(CourseMaterial.objects.filter(course=course).count(), existing_materials + 1)
        queue_course_material_index.assert_called_once_with(response.json()["id"])

    def test_background_indexing_extracts_uploaded_text_into_qdrant(self):
        self.assertTrue(self.client.login(username="teacher", password="sightline"))
        course = Course.objects.get(code="CSE-321")
        response = self.client.post(
            f"/api/v1/courses/{course.id}/materials",
            data={
                "kind": "doc",
                "title": "Searchable upload",
                "file": SimpleUploadedFile("searchable.txt", b"Quicksort uses partitioning around a pivot."),
            },
        )
        material = CourseMaterial.objects.get(id=response.json()["id"])

        indexed_chunks = index_course_material_task.run(material.id)
        contexts = retrieve_course_context(course, "How does quicksort use a pivot?")

        self.assertEqual(response.status_code, 201)
        self.assertGreater(indexed_chunks, 0)
        self.assertIn("partitioning around a pivot", contexts[0]["text"])
        self.assertIsNotNone(CourseMaterial.objects.get(id=material.id).indexed_at)

    @patch.dict(os.environ, {"GROQ_API_KEY": ""})
    def test_teacher_can_create_unit_and_student_can_chat_about_it(self):
        self.assertTrue(self.client.login(username="teacher", password="sightline"))
        course = Course.objects.get(code="CSE-321")
        next_order = CourseUnit.objects.filter(course=course).count() + 1

        unit_response = self.client.post(
            f"/api/v1/courses/{course.id}/units",
            data={"title": "Greedy methods", "summary": "Choosing locally optimal steps.", "order": next_order},
            content_type="application/json",
        )
        self.assertEqual(unit_response.status_code, 201)
        unit_id = unit_response.json()["id"]

        material_response = self.client.post(
            f"/api/v1/courses/{course.id}/materials",
            data={
                "unit": unit_id,
                "kind": "text",
                "title": "Greedy notes",
                "content_text": "Greedy algorithms choose the best local option and need an exchange argument for correctness.",
            },
            content_type="application/json",
        )
        self.assertEqual(material_response.status_code, 201)
        self.client.logout()

        self.assertTrue(self.client.login(username="student", password="sightline"))
        thread_response = self.client.post(
            "/api/v1/course-chat-threads",
            data={"course": course.id, "unit": unit_id, "title": "Greedy help"},
            content_type="application/json",
        )
        self.assertEqual(thread_response.status_code, 201)
        message_response = self.client.post(
            f"/api/v1/course-chat-threads/{thread_response.json()['id']}/messages",
            data={"message": "What makes greedy algorithms correct?"},
            content_type="application/json",
        )
        self.assertEqual(message_response.status_code, 201)
        self.assertEqual(CourseChatMessage.objects.filter(thread_id=thread_response.json()["id"]).count(), 2)

    @patch.dict(os.environ, {"GROQ_API_KEY": "test-groq-key", "GROQ_CHAT_MODEL": "test-groq-model"})
    @patch("sightline.course_rag.course_chat_checkpointer")
    @patch("sightline.course_rag.create_agent")
    @patch("sightline.course_rag.ChatGroq")
    def test_course_chat_uses_langchain_agent_with_thread_memory(self, chat_groq, create_agent_mock, checkpointer):
        checkpointer.return_value = nullcontext("test-checkpointer")
        create_agent_mock.return_value.invoke.return_value = {
            "messages": [SimpleNamespace(content="A generated course answer [1]")]
        }
        self.assertTrue(self.client.login(username="student", password="sightline"))
        course = Course.objects.get(code="CSE-321")
        thread_response = self.client.post(
            "/api/v1/course-chat-threads",
            data={"course": course.id, "title": "Groq help"},
            content_type="application/json",
        )

        response = self.client.post(
            f"/api/v1/course-chat-threads/{thread_response.json()['id']}/messages",
            data={"message": "What should I review?"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["messages"][-1]["content"], "A generated course answer [1]")
        chat_groq.assert_called_once_with(
            api_key="test-groq-key",
            model="test-groq-model",
            temperature=0.2,
            max_tokens=700,
        )
        agent_kwargs = create_agent_mock.call_args.kwargs
        self.assertEqual(agent_kwargs["checkpointer"], "test-checkpointer")
        self.assertEqual(len(agent_kwargs["tools"]), 1)
        thread = CourseChatThread.objects.get(id=thread_response.json()["id"])
        self.assertEqual(
            create_agent_mock.return_value.invoke.call_args.kwargs["config"],
            {"configurable": {"thread_id": thread.checkpoint_thread_id}},
        )
        self.assertNotIn("checkpoint_thread_id", response.json())

    def test_student_cannot_list_or_open_another_students_chat_thread(self):
        self.assertTrue(self.client.login(username="student", password="sightline"))
        course = Course.objects.get(code="CSE-321")
        thread_response = self.client.post(
            "/api/v1/course-chat-threads",
            data={"course": course.id, "title": "Private study thread"},
            content_type="application/json",
        )
        thread_id = thread_response.json()["id"]
        self.client.logout()

        self.assertTrue(self.client.login(username="student02", password="sightline"))
        list_response = self.client.get(f"/api/v1/course-chat-threads?course={course.id}")
        detail_response = self.client.get(f"/api/v1/course-chat-threads/{thread_id}")

        self.assertEqual(list_response.status_code, 200)
        self.assertNotIn(thread_id, [thread["id"] for thread in list_response.json()])
        self.assertEqual(detail_response.status_code, 403)

    def test_teacher_can_delete_unit_with_attached_content(self):
        self.assertTrue(self.client.login(username="teacher", password="sightline"))
        course = Course.objects.get(code="CSE-321")
        unit = CourseUnit.objects.filter(course=course).first()
        self.assertIsNotNone(unit)
        self.assertTrue(CourseMaterial.objects.filter(unit=unit).exists())

        response = self.client.delete(f"/api/v1/course-units/{unit.id}")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(CourseUnit.objects.filter(id=unit.id).exists())
        self.assertFalse(CourseMaterial.objects.filter(unit_id=unit.id).exists())

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

    def test_invigilator_can_upload_exam_video_then_start_analysis(self):
        self.assertTrue(self.client.login(username="invigilator", password="sightline"))
        upload = SimpleUploadedFile("exam-room.mp4", b"not-a-real-video", content_type="video/mp4")

        response = self.client.post(
            "/api/v1/exam-videos",
            data={"file": upload, "notes": "Room A"},
        )

        self.assertEqual(response.status_code, 201)
        video = ExamVideo.objects.get(original_filename="exam-room.mp4")
        self.assertEqual(video.uploaded_by.username, "invigilator")
        self.assertEqual(video.exam_session.quiz_title, "Uploaded Video Review")
        self.assertEqual(video.status, ExamVideo.STATUS_UPLOADED)
        self.assertTrue(video.file_uri.startswith("exam_videos/"))

        with patch("sightline.tasks.queue_exam_video_analysis", return_value={"mode": "realtime-thread", "task_id": None}) as queue:
            start_response = self.client.post(f"/api/v1/exam-videos/{video.id}/analyze")

        self.assertEqual(start_response.status_code, 200)
        video.refresh_from_db()
        self.assertEqual(video.status, ExamVideo.STATUS_ANALYZING)
        queue.assert_called_once_with(video.id)

    def test_invigilator_can_delete_exam_video(self):
        self.assertTrue(self.client.login(username="invigilator", password="sightline"))
        upload = SimpleUploadedFile("delete-me.mp4", b"not-a-real-video", content_type="video/mp4")
        response = self.client.post("/api/v1/exam-videos", data={"file": upload})
        self.assertEqual(response.status_code, 201)
        video_id = response.json()["id"]

        delete_response = self.client.delete(f"/api/v1/exam-videos/{video_id}")

        self.assertEqual(delete_response.status_code, 200)
        self.assertFalse(ExamVideo.objects.filter(id=video_id).exists())

    def test_exam_video_list_includes_analysis_result(self):
        self.assertTrue(self.client.login(username="invigilator", password="sightline"))
        exam_session = ExamSession.objects.get(course__code="CSE-321")
        video = ExamVideo.objects.create(
            exam_session=exam_session,
            uploaded_by=None,
            original_filename="result-video.mp4",
            file_uri="file://result-video.mp4",
            status=ExamVideo.STATUS_COMPLETED,
            frames_analyzed=12,
        )
        ExamVideoAnalysisResult.objects.create(
            exam_video=video,
            model_name="yolov8s",
            report_uri="/media/evidence/session_report.json",
            annotated_video_uri="/media/evidence/annotated_analysis.mp4",
            frames_analyzed=12,
            total_alerts=2,
            alert_counts={"phone": 1, "talking": 1},
            report_payload={"total_alerts": 2},
        )

        response = self.client.get("/api/v1/exam-videos")

        self.assertEqual(response.status_code, 200)
        row = next(item for item in response.json() if item["id"] == video.id)
        self.assertEqual(row["result"]["model_name"], "yolov8s")
        self.assertEqual(row["result"]["total_alerts"], 2)

    def test_yolo_default_model_is_v8s(self):
        self.assertEqual(CFG._clean_model_size(None), "s")
        self.assertEqual(CFG.detector_label(), "yolov8s")
        self.assertTrue(CFG.det_model_name().endswith("yolov8s.pt"))
        self.assertTrue(CFG.pose_model_name().endswith("yolov8s-pose.pt"))

    def test_exam_video_analysis_queue_uses_realtime_thread(self):
        from . import tasks

        with patch.object(tasks._analysis_executor, "submit") as submit:
            submit.return_value = object()
            queue_info = tasks.queue_exam_video_analysis(123)

        self.assertEqual(queue_info["mode"], "realtime-thread")
        self.assertIsNone(queue_info["task_id"])
        submit.assert_called_once_with(tasks._run_threaded_analysis, 123)

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
