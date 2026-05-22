import json

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import authenticate, get_user, login as django_login, logout as django_logout
from django.contrib.auth.models import User
from django.db.models import Count
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from . import serializers
from .models import (
    AcademicRecordImport,
    AlertEvent,
    AssessmentRecord,
    AttendanceRecord,
    Camera,
    Course,
    CourseEnrollment,
    Department,
    EvidenceAsset,
    ExamAttempt,
    ExamSession,
    ExamVideo,
    NotificationEvent,
    OperationalHealth,
    ReviewerAction,
    StudentProfile,
    StudentRiskScore,
    UserProfile,
)
from .services import agenda_for_student, calculate_risk_run, generate_due_notifications


def django_user(request):
    django_request = getattr(request, "_request", request)
    return get_user(django_request)


def is_authenticated_request(request):
    user = django_user(request)
    return bool(user and user.is_authenticated)


def is_admin_request(request):
    user = django_user(request)
    profile = getattr(user, "sightline_profile", None) if user else None
    return bool(user and user.is_authenticated and (user.is_superuser or (profile and profile.role == UserProfile.ROLE_ADMIN)))


def user_role(request):
    user = django_user(request)
    profile = getattr(user, "sightline_profile", None) if user else None
    return profile.role if profile else None


def has_role(request, *roles):
    return is_admin_request(request) or user_role(request) in roles


class SessionlessAPIView(APIView):
    authentication_classes = []
    permission_classes = []


class LoginView(SessionlessAPIView):
    def post(self, request):
        serializer = serializers.LoginSerializer(data=request.data, context={"request": request._request})
        if not serializer.is_valid():
            return Response({"detail": serializer.errors.get("non_field_errors", ["Invalid login."])[0]}, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data["user"]
        django_login(request._request, user)
        return Response(
            {
                "message": "Signed in.",
                "user": serializers.CurrentUserSerializer(user).data,
            }
        )


class LogoutView(SessionlessAPIView):
    def post(self, request):
        django_logout(request._request)
        return Response({"message": "Signed out."})


class CurrentUserView(SessionlessAPIView):
    def get(self, request):
        if not is_authenticated_request(request):
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializers.CurrentUserSerializer(django_user(request)).data)


class ApiV1DispatchView(SessionlessAPIView):
    def get(self, request, path=""):
        return self.handle_path(request, path)

    def post(self, request, path=""):
        return self.handle_path(request, path)

    def put(self, request, path=""):
        return self.handle_path(request, path)

    def patch(self, request, path=""):
        return self.handle_path(request, path)

    def delete(self, request, path=""):
        return self.handle_path(request, path)

    def auth_required(self, request):
        if not is_authenticated_request(request):
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        return None

    def admin_required(self, request):
        if not is_admin_request(request):
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        return None

    def handle_path(self, request, path=""):
        clean_path = path.strip("/")

        if clean_path == "auth/providers" and request.method == "GET":
            return Response([])

        if clean_path == "me" and request.method == "GET":
            return CurrentUserView().get(request)

        if clean_path == "notifications" and request.method == "GET":
            auth_error = self.auth_required(request)
            return auth_error or Response([])

        if clean_path == "notifications/read-all" and request.method == "POST":
            auth_error = self.auth_required(request)
            return auth_error or Response({"notification": None, "unread_count": 0})

        if clean_path.startswith("notifications/") and clean_path.endswith("/read") and request.method == "POST":
            auth_error = self.auth_required(request)
            return auth_error or Response({"notification": None, "unread_count": 0})

        if clean_path == "billing/summary" and request.method == "GET":
            auth_error = self.auth_required(request)
            return auth_error or Response(billing_summary())

        if clean_path == "billing/ledger" and request.method == "GET":
            auth_error = self.auth_required(request)
            return auth_error or Response([])

        if clean_path == "admin/overview" and request.method == "GET":
            admin_error = self.admin_required(request)
            return admin_error or Response(admin_overview_payload())

        if clean_path == "admin/providers" and request.method == "GET":
            admin_error = self.admin_required(request)
            return admin_error or Response([])

        if clean_path == "admin/users":
            admin_error = self.admin_required(request)
            if admin_error:
                return admin_error
            if request.method == "GET":
                users = User.objects.select_related("sightline_profile").order_by("id")
                return Response(serializers.AdminUserSerializer(users, many=True).data)
            if request.method == "POST":
                create_serializer = serializers.AdminUserCreateSerializer(data=request.data)
                create_serializer.is_valid(raise_exception=True)
                user = create_serializer.save()
                return Response(serializers.AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)

        if clean_path.startswith("admin/users/"):
            admin_error = self.admin_required(request)
            if admin_error:
                return admin_error
            parts = clean_path.split("/")
            if len(parts) < 3:
                return Response({"detail": "Invalid user route."}, status=status.HTTP_404_NOT_FOUND)
            user = User.objects.filter(id=parts[2]).select_related("sightline_profile").first()
            if not user:
                return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            if len(parts) == 3 and request.method == "PATCH":
                update_serializer = serializers.AdminUserUpdateSerializer(
                    user,
                    data=request.data,
                    partial=True,
                    context={"request": request},
                )
                update_serializer.is_valid(raise_exception=True)
                user = update_serializer.save()
                return Response(serializers.AdminUserSerializer(user).data)
            if len(parts) == 4 and parts[3] == "password" and request.method == "POST":
                password_serializer = serializers.PasswordSetSerializer(user, data=request.data)
                password_serializer.is_valid(raise_exception=True)
                user = password_serializer.save()
                return Response(serializers.AdminUserSerializer(user).data)
            if len(parts) == 5 and parts[3] == "password" and parts[4] == "reset" and request.method == "POST":
                temporary_password = f"sightline-{user.id:04d}"
                user.set_password(temporary_password)
                user.save()
                return Response(
                    {
                        "user": serializers.AdminUserSerializer(user).data,
                        "temporary_password": temporary_password,
                    }
                )

        if clean_path == "courses":
            auth_error = self.auth_required(request)
            if auth_error:
                return auth_error
            if request.method == "GET":
                queryset = Course.objects.select_related("teacher", "department", "semester").order_by("code")
                if user_role(request) == UserProfile.ROLE_TEACHER and not is_admin_request(request):
                    queryset = queryset.filter(teacher=django_user(request))
                return Response(serializers.CourseSerializer(queryset, many=True).data)
            if request.method == "POST":
                if not has_role(request, UserProfile.ROLE_TEACHER):
                    return Response({"detail": "Only teachers or admins can create courses."}, status=status.HTTP_403_FORBIDDEN)
                serializer = serializers.CourseSerializer(data=request.data, context={"request": request})
                serializer.is_valid(raise_exception=True)
                course = serializer.save()
                return Response(serializers.CourseSerializer(course).data, status=status.HTTP_201_CREATED)

        if clean_path == "enrollments" and request.method == "GET":
            auth_error = self.auth_required(request)
            if auth_error:
                return auth_error
            queryset = CourseEnrollment.objects.select_related("course", "student").order_by("-created_at")
            if user_role(request) == UserProfile.ROLE_STUDENT and not is_admin_request(request):
                student = serializers.student_for_user(django_user(request))
                queryset = queryset.filter(student=student) if student else queryset.none()
            elif user_role(request) == UserProfile.ROLE_TEACHER and not is_admin_request(request):
                queryset = queryset.filter(course__teacher=django_user(request))
            return Response(serializers.CourseEnrollmentSerializer(queryset, many=True).data)

        if clean_path.startswith("courses/") and clean_path.endswith("/enroll") and request.method == "POST":
            auth_error = self.auth_required(request)
            if auth_error:
                return auth_error
            if not has_role(request, UserProfile.ROLE_STUDENT):
                return Response({"detail": "Only students or admins can enroll in courses."}, status=status.HTTP_403_FORBIDDEN)
            course_id = clean_path.split("/")[1]
            course = Course.objects.filter(id=course_id).first()
            if not course:
                return Response({"detail": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
            student = serializers.student_for_user(django_user(request))
            if not student:
                return Response({"detail": "Student profile not found."}, status=status.HTTP_400_BAD_REQUEST)
            enrollment, _ = CourseEnrollment.objects.update_or_create(
                course=course,
                student=student,
                defaults={"status": CourseEnrollment.STATUS_ACTIVE},
            )
            return Response(serializers.CourseEnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)

        if clean_path == "exams":
            auth_error = self.auth_required(request)
            if auth_error:
                return auth_error
            if request.method == "GET":
                queryset = ExamSession.objects.select_related("course", "hall").order_by("-starts_at")
                if user_role(request) == UserProfile.ROLE_TEACHER and not is_admin_request(request):
                    queryset = queryset.filter(course__teacher=django_user(request))
                elif user_role(request) == UserProfile.ROLE_STUDENT and not is_admin_request(request):
                    student = serializers.student_for_user(django_user(request))
                    course_ids = CourseEnrollment.objects.filter(student=student).values_list("course_id", flat=True) if student else []
                    queryset = queryset.filter(course_id__in=course_ids)
                return Response(serializers.ExamSessionSerializer(queryset, many=True).data)
            if request.method == "POST":
                if not has_role(request, UserProfile.ROLE_TEACHER):
                    return Response({"detail": "Only teachers or admins can create exams."}, status=status.HTTP_403_FORBIDDEN)
                course = Course.objects.filter(id=request.data.get("course")).first()
                if not course:
                    return Response({"detail": "Course not found."}, status=status.HTTP_400_BAD_REQUEST)
                if not is_admin_request(request) and course.teacher_id != django_user(request).id:
                    return Response({"detail": "Teachers can create exams only for their own courses."}, status=status.HTTP_403_FORBIDDEN)
                serializer = serializers.ExamSessionSerializer(data=request.data, context={"request": request})
                serializer.is_valid(raise_exception=True)
                exam = serializer.save()
                return Response(serializers.ExamSessionSerializer(exam).data, status=status.HTTP_201_CREATED)

        if clean_path.startswith("exams/") and clean_path.endswith("/attempt") and request.method == "POST":
            auth_error = self.auth_required(request)
            if auth_error:
                return auth_error
            if not has_role(request, UserProfile.ROLE_STUDENT):
                return Response({"detail": "Only students or admins can submit exam attempts."}, status=status.HTTP_403_FORBIDDEN)
            exam_id = clean_path.split("/")[1]
            exam = ExamSession.objects.filter(id=exam_id).first()
            if not exam:
                return Response({"detail": "Exam not found."}, status=status.HTTP_404_NOT_FOUND)
            student = serializers.student_for_user(django_user(request))
            if not student:
                return Response({"detail": "Student profile not found."}, status=status.HTTP_400_BAD_REQUEST)
            if not CourseEnrollment.objects.filter(
                course=exam.course,
                student=student,
                status=CourseEnrollment.STATUS_ACTIVE,
            ).exists():
                return Response({"detail": "Enroll in this course before submitting the exam."}, status=status.HTTP_403_FORBIDDEN)
            attempt, _ = ExamAttempt.objects.update_or_create(
                exam_session=exam,
                student=student,
                defaults={
                    "answers": request.data.get("answers") or {},
                    "status": ExamAttempt.STATUS_SUBMITTED,
                    "submitted_at": timezone.now(),
                },
            )
            return Response(serializers.ExamAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)

        if clean_path == "exam-attempts" and request.method == "GET":
            auth_error = self.auth_required(request)
            if auth_error:
                return auth_error
            queryset = ExamAttempt.objects.select_related("exam_session", "exam_session__course", "student").order_by("-created_at")
            if user_role(request) == UserProfile.ROLE_STUDENT and not is_admin_request(request):
                student = serializers.student_for_user(django_user(request))
                queryset = queryset.filter(student=student) if student else queryset.none()
            elif user_role(request) == UserProfile.ROLE_TEACHER and not is_admin_request(request):
                queryset = queryset.filter(exam_session__course__teacher=django_user(request))
            return Response(serializers.ExamAttemptSerializer(queryset, many=True).data)

        if clean_path == "exam-videos":
            auth_error = self.auth_required(request)
            if auth_error:
                return auth_error
            if request.method == "GET":
                if not has_role(request, UserProfile.ROLE_INVIGILATOR, UserProfile.ROLE_TEACHER):
                    return Response({"detail": "Only invigilators, teachers, or admins can monitor exam videos."}, status=status.HTTP_403_FORBIDDEN)
                queryset = ExamVideo.objects.select_related("exam_session", "exam_session__course", "uploaded_by").order_by("-created_at")
                if user_role(request) == UserProfile.ROLE_TEACHER and not is_admin_request(request):
                    queryset = queryset.filter(exam_session__course__teacher=django_user(request))
                return Response(serializers.ExamVideoSerializer(queryset, many=True).data)
            if request.method == "POST":
                if not has_role(request, UserProfile.ROLE_INVIGILATOR):
                    return Response({"detail": "Only invigilators or admins can upload exam videos."}, status=status.HTTP_403_FORBIDDEN)
                serializer = serializers.ExamVideoSerializer(data=request.data, context={"request": request})
                serializer.is_valid(raise_exception=True)
                video = serializer.save()
                return Response(serializers.ExamVideoSerializer(video).data, status=status.HTTP_201_CREATED)

        if clean_path == "at-risk":
            auth_error = self.auth_required(request)
            if auth_error:
                return auth_error
            if not has_role(request, UserProfile.ROLE_TEACHER):
                return Response({"detail": "Only teachers or admins can identify at-risk students."}, status=status.HTTP_403_FORBIDDEN)
            if request.method == "GET":
                queryset = StudentRiskScore.objects.select_related("student", "course", "run").order_by("-risk_score")
                if user_role(request) == UserProfile.ROLE_TEACHER and not is_admin_request(request):
                    queryset = queryset.filter(course__teacher=django_user(request))
                return Response(serializers.StudentRiskScoreSerializer(queryset, many=True).data)
            if request.method == "POST":
                course = Course.objects.filter(id=request.data.get("course")).first()
                if not course:
                    return Response({"detail": "Course not found."}, status=status.HTTP_400_BAD_REQUEST)
                if not is_admin_request(request) and course.teacher_id != django_user(request).id:
                    return Response({"detail": "Teachers can run risk checks only for their own courses."}, status=status.HTTP_403_FORBIDDEN)
                serializer = serializers.AtRiskRunSerializer(data=request.data, context={"request": request})
                serializer.is_valid(raise_exception=True)
                run = serializer.save()
                return Response(
                    {
                        "run_id": run.id,
                        "scores": serializers.StudentRiskScoreSerializer(run.scores.select_related("student", "course"), many=True).data,
                    },
                    status=status.HTTP_201_CREATED,
                )

        return self.compatibility_response(request, clean_path)

    def compatibility_response(self, request, clean_path):
        if clean_path == "admin/credits" and request.method == "POST":
            admin_error = self.admin_required(request)
            if admin_error:
                return admin_error
            return Response(
                {
                    "entry": {
                        "id": 0,
                        "delta": 0,
                        "balance_after": 0,
                        "reason": "mvp_noop",
                        "reference": "mvp",
                        "metadata": {},
                        "created_at": timezone.now().isoformat(),
                    },
                    "balance": 0,
                }
            )

        if clean_path in {"api-keys", "playground/api-keys", "logs", "user-settings"} and request.method == "GET":
            auth_error = self.auth_required(request)
            return auth_error or Response([])

        if clean_path == "api-keys" and request.method == "POST":
            auth_error = self.auth_required(request)
            if auth_error:
                return auth_error
            now = timezone.now().isoformat()
            return Response(
                {
                    "id": 0,
                    "name": request.data.get("name") or "MVP key",
                    "key_prefix": "mvp",
                    "is_active": True,
                    "rate_limit_per_minute": 0,
                    "daily_limit": 0,
                    "permissions": [],
                    "revoked_at": None,
                    "created_at": now,
                    "updated_at": now,
                    "raw_key": "mvp-local-placeholder",
                },
                status=status.HTTP_201_CREATED,
            )

        if clean_path.startswith("api-keys/") and clean_path.endswith("/revoke") and request.method == "POST":
            auth_error = self.auth_required(request)
            if auth_error:
                return auth_error
            now = timezone.now().isoformat()
            return Response(
                {
                    "id": 0,
                    "name": "MVP key",
                    "key_prefix": "mvp",
                    "is_active": False,
                    "rate_limit_per_minute": 0,
                    "daily_limit": 0,
                    "permissions": [],
                    "revoked_at": now,
                    "created_at": now,
                    "updated_at": now,
                }
            )

        if clean_path == "playground/search" and request.method == "POST":
            auth_error = self.auth_required(request)
            if auth_error:
                return auth_error
            return Response(
                {
                    "searchParameters": {
                        "q": request.data.get("q") or "",
                        "gl": request.data.get("gl") or "us",
                        "hl": request.data.get("hl") or "en",
                        "num": request.data.get("num") or 10,
                        "type": request.data.get("type") or "search",
                        "engine": request.data.get("engine") or "mvp",
                        "autocorrect": bool(request.data.get("autocorrect", True)),
                    },
                    "organic": [],
                    "knowledgeGraph": None,
                    "peopleAlsoAsk": [],
                    "relatedSearches": [],
                }
            )

        if clean_path.startswith("user-settings/") and request.method == "PUT":
            auth_error = self.auth_required(request)
            if auth_error:
                return auth_error
            key = clean_path.split("/", 1)[1]
            now = timezone.now().isoformat()
            return Response(
                {
                    "id": 0,
                    "user_id": django_user(request).id,
                    "key": key,
                    "value": request.data.get("value"),
                    "created_at": now,
                    "updated_at": now,
                }
            )

        if clean_path == "mcp/config" and request.method == "GET":
            auth_error = self.auth_required(request)
            return auth_error or Response(mcp_config_payload())

        if clean_path == "billing/checkout-session" and request.method == "POST":
            auth_error = self.auth_required(request)
            return auth_error or Response({"session_id": "mvp", "checkout_url": None, "publishable_key": ""})

        if clean_path == "billing/portal-session" and request.method == "POST":
            auth_error = self.auth_required(request)
            return auth_error or Response({"url": ""})

        if clean_path == "pricing/plans" and request.method == "GET":
            return Response([])

        if clean_path == "early-access/leads" and request.method == "POST":
            return Response({"message": "Received."}, status=status.HTTP_201_CREATED)

        if clean_path == "auth/password/reset" and request.method == "POST":
            return Response({"message": "Password reset is disabled in the MVP."})

        if clean_path == "admin/analytics" and request.method == "GET":
            admin_error = self.admin_required(request)
            return admin_error or Response(analytics_payload())

        if clean_path in {
            "admin/proxy-endpoints",
            "admin/models",
            "admin/content/posts",
            "admin/content/assets",
            "admin/plans",
            "admin/provider-credentials",
            "admin/proxies",
            "admin/proxies/sync",
            "admin/sessions",
            "admin/feature-flags",
            "admin/system-settings",
        }:
            admin_error = self.admin_required(request)
            if admin_error:
                return admin_error
            if clean_path == "admin/content/posts":
                return Response({"posts": []})
            return Response([])

        if clean_path == "admin/provider-routing":
            admin_error = self.admin_required(request)
            return admin_error or Response(provider_routing_payload())

        if clean_path.startswith("admin/system-settings/") and request.method == "PUT":
            admin_error = self.admin_required(request)
            if admin_error:
                return admin_error
            key = clean_path.split("/", 2)[2]
            return Response(system_setting_payload(key, request.data.get("value")))

        if clean_path.startswith("admin/feature-flags/") and request.method == "PUT":
            admin_error = self.admin_required(request)
            if admin_error:
                return admin_error
            key = clean_path.split("/", 2)[2]
            return Response(feature_flag_payload(key, bool(request.data.get("enabled")), request.data.get("description") or ""))

        if clean_path.startswith("admin/models/"):
            admin_error = self.admin_required(request)
            if admin_error:
                return admin_error
            parts = clean_path.split("/")
            model = parts[2] if len(parts) > 2 else "unknown"
            if request.method == "GET":
                return Response({"model": model, "records": []})
            if request.method == "DELETE":
                return Response({"deleted": True, "record_id": int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 0})
            return Response(request.data.get("data") or {})

        if clean_path.startswith("admin/content/posts/"):
            admin_error = self.admin_required(request)
            if admin_error:
                return admin_error
            if request.method == "DELETE":
                return Response({"deleted": True, "record_id": 0})
            return Response(request.data)

        if clean_path.startswith("admin/provider-credentials/") or clean_path.startswith("admin/proxies/"):
            admin_error = self.admin_required(request)
            return admin_error or Response(request.data or {})

        if clean_path.startswith("admin/sessions/") and request.method == "POST":
            admin_error = self.admin_required(request)
            if admin_error:
                return admin_error
            now = timezone.now().isoformat()
            provider = clean_path.split("/", 2)[2]
            return Response(
                {
                    "id": f"mvp-{provider}",
                    "provider": provider,
                    "proxy_id": None,
                    "state_blob": "",
                    "user_agent": "",
                    "seeded_at": now,
                    "expires_at": None,
                    "quality_score": 0,
                    "captcha_hits": 0,
                    "request_count": 0,
                    "success_count": 0,
                    "parse_failures": 0,
                    "last_failure_reason": None,
                    "last_block_reason": None,
                    "seeded_via": "mvp",
                    "trusted_source": False,
                    "last_validated_at": None,
                    "status": "healthy",
                },
                status=status.HTTP_201_CREATED,
            )

        return Response({"detail": f"MVP endpoint not implemented: /api/v1/{clean_path}"}, status=status.HTTP_404_NOT_FOUND)


def parse_body(request):
    if not request.body:
        return {}
    return json.loads(request.body.decode("utf-8"))


def serialize_current_user(user):
    profile = getattr(user, "sightline_profile", None)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email or None,
        "primary_provider": "password",
        "role": profile.role if profile else "student",
        "is_superuser": user.is_superuser,
    }


@csrf_exempt
@require_http_methods(["POST"])
def auth_login(request):
    data = parse_body(request)
    identifier = (data.get("identifier") or data.get("username") or "").strip()
    password = data.get("password") or ""

    username = identifier
    if "@" in identifier:
        matched_user = User.objects.filter(email__iexact=identifier).first()
        username = matched_user.username if matched_user else identifier

    user = authenticate(request, username=username, password=password)
    if not user:
        return JsonResponse({"detail": "Invalid username or password."}, status=400)
    if not user.is_active:
        return JsonResponse({"detail": "This account is disabled."}, status=403)

    django_login(request, user)
    return JsonResponse({"message": "Signed in.", "user": serialize_current_user(user)})


@csrf_exempt
@require_http_methods(["POST"])
def auth_logout(request):
    django_logout(request)
    return JsonResponse({"message": "Signed out."})


def current_user(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    return JsonResponse(serialize_current_user(request.user))


def require_authenticated(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    return None


def require_admin(request):
    auth_error = require_authenticated(request)
    if auth_error:
        return auth_error
    profile = getattr(request.user, "sightline_profile", None)
    if not (request.user.is_superuser or (profile and profile.role == UserProfile.ROLE_ADMIN)):
        return JsonResponse({"detail": "Admin access required."}, status=403)
    return None


def role_permissions(role):
    if role == UserProfile.ROLE_ADMIN:
        return ["users.manage", "setup.manage", "alerts.review"]
    if role == UserProfile.ROLE_INVIGILATOR:
        return ["alerts.review"]
    if role == UserProfile.ROLE_TEACHER:
        return ["videos.upload"]
    return []


def serialize_admin_user(user):
    profile = getattr(user, "sightline_profile", None)
    role = profile.role if profile else UserProfile.ROLE_STUDENT
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email or None,
        "primary_provider": "password",
        "role": role,
        "is_superuser": user.is_superuser,
        "is_active": user.is_active,
        "account_type": "staff" if role == UserProfile.ROLE_ADMIN else "client",
        "staff_role": "admin" if role == UserProfile.ROLE_ADMIN else None,
        "staff_permissions": role_permissions(role),
        "can_manage_staff": user.is_superuser or role == UserProfile.ROLE_ADMIN,
        "api_key_count": 0,
        "active_api_key_count": 0,
        "balance": 0,
        "monthly_free_credits": 0,
        "subscription_status": None,
        "total_search_events": 0,
        "last_activity_at": user.last_login.isoformat() if user.last_login else None,
        "created_at": user.date_joined.isoformat(),
        "updated_at": user.date_joined.isoformat(),
    }


def billing_summary():
    return {
        "balance": 0,
        "monthly_free_credits": 0,
        "current_period_start": None,
        "current_period_end": None,
        "search_credit_cost": 0,
        "credit_value_usd": 0,
        "custom_engines_enabled": False,
        "allowed_engines": [],
        "credit_buckets": [],
        "credit_policy": {},
        "stripe_configured": False,
        "portal_available": False,
        "active_subscription": None,
        "plans": [],
    }


def admin_overview_payload():
    return {
        "total_users": User.objects.count(),
        "active_users_30d": User.objects.filter(is_active=True).count(),
        "search_volume_24h": 0,
        "success_rate_24h": 1,
        "degraded_searches_24h": 0,
        "credits_consumed_30d": 0,
        "credits_granted_30d": 0,
        "provider_ready_count": 0,
        "proxy_ready_count": 0,
        "healthy_session_count": 0,
        "recent_incidents": [],
    }


def mcp_config_payload():
    return {
        "endpoint_url": "http://127.0.0.1:8000/mcp",
        "protocol_version": "2024-11-05",
        "server_name": "sightline-mvp",
        "tools": [],
        "auth": {"type": "none"},
        "sample_config": {},
    }


def provider_routing_payload():
    return {
        "inhouse_order": [],
        "external_order": [],
        "enabled_providers": {},
        "proxy_cooldown_seconds": 0,
        "proxy_block_cooldown_seconds": 0,
        "max_inhouse_proxies_per_request": 0,
        "local_diagnostic_enabled": False,
    }


def analytics_payload():
    return {
        "cards": [],
        "plan_distribution": [],
        "provider_breakdown": [],
        "top_failures": [],
        "recent_activity": [],
    }


def system_setting_payload(key, value=None):
    return {
        "id": 0,
        "key": key,
        "value": value,
        "created_at": timezone.now().isoformat(),
        "updated_at": timezone.now().isoformat(),
    }


def feature_flag_payload(key, enabled=False, description=""):
    return {
        "key": key,
        "enabled": enabled,
        "description": description,
        "scope": "mvp",
        "updated_at": timezone.now().isoformat(),
    }


def parse_role(value):
    role = (value or "").strip()
    allowed = {choice[0] for choice in UserProfile.ROLE_CHOICES}
    return role if role in allowed else UserProfile.ROLE_STUDENT


def ensure_profile(user, role):
    department = Department.objects.first()
    profile, _ = UserProfile.objects.update_or_create(
        user=user,
        defaults={"role": role, "department": department},
    )
    if role == UserProfile.ROLE_ADMIN:
        user.is_staff = True
        user.is_superuser = True
    else:
        user.is_staff = False
        user.is_superuser = False
    user.save(update_fields=["is_staff", "is_superuser"])
    return profile


@csrf_exempt
def api_v1_dispatch(request, path=""):
    clean_path = path.strip("/")

    if clean_path == "auth/providers" and request.method == "GET":
        return JsonResponse([])

    if clean_path == "me" and request.method == "GET":
        return current_user(request)

    if clean_path == "notifications" and request.method == "GET":
        auth_error = require_authenticated(request)
        if auth_error:
            return auth_error
        return JsonResponse([], safe=False)

    if clean_path == "notifications/read-all" and request.method == "POST":
        auth_error = require_authenticated(request)
        if auth_error:
            return auth_error
        return JsonResponse({"notification": None, "unread_count": 0})

    if clean_path.startswith("notifications/") and clean_path.endswith("/read") and request.method == "POST":
        auth_error = require_authenticated(request)
        if auth_error:
            return auth_error
        return JsonResponse({"notification": None, "unread_count": 0})

    if clean_path == "billing/summary" and request.method == "GET":
        auth_error = require_authenticated(request)
        if auth_error:
            return auth_error
        return JsonResponse(billing_summary())

    if clean_path == "billing/ledger" and request.method == "GET":
        auth_error = require_authenticated(request)
        if auth_error:
            return auth_error
        return JsonResponse([], safe=False)

    if clean_path == "admin/overview" and request.method == "GET":
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        return JsonResponse(admin_overview_payload())

    if clean_path == "admin/providers" and request.method == "GET":
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        return JsonResponse([], safe=False)

    if clean_path == "admin/users":
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        if request.method == "GET":
            users = User.objects.select_related("sightline_profile").order_by("id")
            return JsonResponse([serialize_admin_user(user) for user in users], safe=False)
        if request.method == "POST":
            data = parse_body(request)
            username = (data.get("username") or "").strip()
            password = data.get("password") or "sightline"
            if not username:
                return JsonResponse({"detail": "Username is required."}, status=400)
            if User.objects.filter(username=username).exists():
                return JsonResponse({"detail": "Username already exists."}, status=400)
            role = parse_role(data.get("role"))
            user = User.objects.create_user(
                username=username,
                email=(data.get("email") or "").strip(),
                password=password,
                is_active=bool(data.get("is_active", True)),
            )
            ensure_profile(user, role)
            return JsonResponse(serialize_admin_user(user), status=201)

    if clean_path.startswith("admin/users/"):
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        parts = clean_path.split("/")
        if len(parts) < 3:
            return JsonResponse({"detail": "Invalid user route."}, status=404)
        user = User.objects.filter(id=parts[2]).select_related("sightline_profile").first()
        if not user:
            return JsonResponse({"detail": "User not found."}, status=404)
        if len(parts) == 3 and request.method == "PATCH":
            data = parse_body(request)
            if "email" in data:
                user.email = (data.get("email") or "").strip()
            if "is_active" in data and user.id != request.user.id:
                user.is_active = bool(data.get("is_active"))
            if "role" in data:
                ensure_profile(user, parse_role(data.get("role")))
            user.save()
            return JsonResponse(serialize_admin_user(user))
        if len(parts) == 4 and parts[3] == "password" and request.method == "POST":
            data = parse_body(request)
            password = data.get("password") or ""
            if len(password) < 8:
                return JsonResponse({"detail": "Password must be at least 8 characters."}, status=400)
            user.set_password(password)
            user.save()
            return JsonResponse(serialize_admin_user(user))
        if len(parts) == 5 and parts[3] == "password" and parts[4] == "reset" and request.method == "POST":
            temporary_password = f"sightline-{user.id:04d}"
            user.set_password(temporary_password)
            user.save()
            return JsonResponse({"user": serialize_admin_user(user), "temporary_password": temporary_password})

    if clean_path == "admin/credits" and request.method == "POST":
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        return JsonResponse(
            {
                "entry": {
                    "id": 0,
                    "delta": 0,
                    "balance_after": 0,
                    "reason": "mvp_noop",
                    "reference": "mvp",
                    "metadata": {},
                    "created_at": timezone.now().isoformat(),
                },
                "balance": 0,
            }
        )

    if clean_path in {"api-keys", "playground/api-keys", "logs", "user-settings"} and request.method == "GET":
        auth_error = require_authenticated(request)
        if auth_error:
            return auth_error
        return JsonResponse([], safe=False)

    if clean_path == "api-keys" and request.method == "POST":
        auth_error = require_authenticated(request)
        if auth_error:
            return auth_error
        data = parse_body(request)
        now = timezone.now().isoformat()
        return JsonResponse(
            {
                "id": 0,
                "name": data.get("name") or "MVP key",
                "key_prefix": "mvp",
                "is_active": True,
                "rate_limit_per_minute": 0,
                "daily_limit": 0,
                "permissions": [],
                "revoked_at": None,
                "created_at": now,
                "updated_at": now,
                "raw_key": "mvp-local-placeholder",
            },
            status=201,
        )

    if clean_path.startswith("api-keys/") and clean_path.endswith("/revoke") and request.method == "POST":
        auth_error = require_authenticated(request)
        if auth_error:
            return auth_error
        now = timezone.now().isoformat()
        return JsonResponse(
            {
                "id": 0,
                "name": "MVP key",
                "key_prefix": "mvp",
                "is_active": False,
                "rate_limit_per_minute": 0,
                "daily_limit": 0,
                "permissions": [],
                "revoked_at": now,
                "created_at": now,
                "updated_at": now,
            }
        )

    if clean_path == "playground/search" and request.method == "POST":
        auth_error = require_authenticated(request)
        if auth_error:
            return auth_error
        data = parse_body(request)
        return JsonResponse(
            {
                "searchParameters": {
                    "q": data.get("q") or "",
                    "gl": data.get("gl") or "us",
                    "hl": data.get("hl") or "en",
                    "num": data.get("num") or 10,
                    "type": data.get("type") or "search",
                    "engine": data.get("engine") or "mvp",
                    "autocorrect": bool(data.get("autocorrect", True)),
                },
                "organic": [],
                "knowledgeGraph": None,
                "peopleAlsoAsk": [],
                "relatedSearches": [],
            }
        )

    if clean_path.startswith("user-settings/") and request.method == "PUT":
        auth_error = require_authenticated(request)
        if auth_error:
            return auth_error
        key = clean_path.split("/", 1)[1]
        data = parse_body(request)
        now = timezone.now().isoformat()
        return JsonResponse(
            {
                "id": 0,
                "user_id": request.user.id,
                "key": key,
                "value": data.get("value"),
                "created_at": now,
                "updated_at": now,
            }
        )

    if clean_path == "mcp/config" and request.method == "GET":
        auth_error = require_authenticated(request)
        if auth_error:
            return auth_error
        return JsonResponse(mcp_config_payload())

    if clean_path == "billing/checkout-session" and request.method == "POST":
        auth_error = require_authenticated(request)
        if auth_error:
            return auth_error
        return JsonResponse({"session_id": "mvp", "checkout_url": None, "publishable_key": ""})

    if clean_path == "billing/portal-session" and request.method == "POST":
        auth_error = require_authenticated(request)
        if auth_error:
            return auth_error
        return JsonResponse({"url": ""})

    if clean_path == "pricing/plans" and request.method == "GET":
        return JsonResponse([], safe=False)

    if clean_path == "early-access/leads" and request.method == "POST":
        return JsonResponse({"message": "Received."}, status=201)

    if clean_path == "auth/password/reset" and request.method == "POST":
        return JsonResponse({"message": "Password reset is disabled in the MVP."})

    if clean_path == "admin/analytics" and request.method == "GET":
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        return JsonResponse(analytics_payload())

    if clean_path in {
        "admin/proxy-endpoints",
        "admin/models",
        "admin/content/posts",
        "admin/content/assets",
        "admin/plans",
        "admin/provider-credentials",
        "admin/proxies",
        "admin/proxies/sync",
        "admin/sessions",
        "admin/feature-flags",
        "admin/system-settings",
    }:
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        if clean_path == "admin/content/posts":
            return JsonResponse({"posts": []})
        return JsonResponse([], safe=False)

    if clean_path == "admin/provider-routing":
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        return JsonResponse(provider_routing_payload())

    if clean_path.startswith("admin/system-settings/") and request.method == "PUT":
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        key = clean_path.split("/", 2)[2]
        data = parse_body(request)
        return JsonResponse(system_setting_payload(key, data.get("value")))

    if clean_path.startswith("admin/feature-flags/") and request.method == "PUT":
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        key = clean_path.split("/", 2)[2]
        data = parse_body(request)
        return JsonResponse(feature_flag_payload(key, bool(data.get("enabled")), data.get("description") or ""))

    if clean_path.startswith("admin/models/"):
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        parts = clean_path.split("/")
        model = parts[2] if len(parts) > 2 else "unknown"
        if request.method == "GET":
            return JsonResponse({"model": model, "records": []})
        if request.method == "DELETE":
            return JsonResponse({"deleted": True, "record_id": int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 0})
        data = parse_body(request)
        return JsonResponse(data.get("data") or {})

    if clean_path.startswith("admin/content/posts/"):
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        if request.method == "DELETE":
            return JsonResponse({"deleted": True, "record_id": 0})
        return JsonResponse(parse_body(request))

    if clean_path.startswith("admin/provider-credentials/") or clean_path.startswith("admin/proxies/"):
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        return JsonResponse(parse_body(request) or {})

    if clean_path.startswith("admin/sessions/") and request.method == "POST":
        admin_error = require_admin(request)
        if admin_error:
            return admin_error
        now = timezone.now().isoformat()
        provider = clean_path.split("/", 2)[2]
        return JsonResponse(
            {
                "id": f"mvp-{provider}",
                "provider": provider,
                "proxy_id": None,
                "state_blob": "",
                "user_agent": "",
                "seeded_at": now,
                "expires_at": None,
                "quality_score": 0,
                "captcha_hits": 0,
                "request_count": 0,
                "success_count": 0,
                "parse_failures": 0,
                "last_failure_reason": None,
                "last_block_reason": None,
                "seeded_via": "mvp",
                "trusted_source": False,
                "last_validated_at": None,
                "status": "healthy",
            },
            status=201,
        )

    return JsonResponse({"detail": f"MVP endpoint not implemented: /api/v1/{clean_path}"}, status=404)


def api_root(_request):
    return JsonResponse(
        {
            "name": "Sightline API",
            "links": {
                "overview": "/api/overview/",
                "alerts": "/api/integrity/alerts/",
                "risk": "/api/analytics/risk/",
                "agenda": "/api/schedules/agenda/",
                "health": "/api/operations/health/",
            },
        }
    )


def personas(_request):
    profiles = UserProfile.objects.select_related("user", "department").order_by("role", "user__username")
    return JsonResponse(
        {
            "personas": [
                {
                    "username": profile.user.username,
                    "name": profile.user.get_full_name() or profile.user.username,
                    "role": profile.role,
                    "department": profile.department.code if profile.department else None,
                }
                for profile in profiles
            ]
        }
    )


def overview(_request):
    return JsonResponse(
        {
            "counts": {
                "activeCameras": Camera.objects.filter(status=Camera.STATUS_ACTIVE).count(),
                "degradedCameras": Camera.objects.filter(status=Camera.STATUS_DEGRADED).count(),
                "liveExamSessions": ExamSession.objects.filter(status=ExamSession.STATUS_LIVE).count(),
                "visibleAlerts": AlertEvent.objects.filter(status=AlertEvent.STATUS_VISIBLE).count(),
                "highRiskStudents": StudentRiskScore.objects.filter(risk_level=StudentRiskScore.LEVEL_HIGH).count(),
                "notifications": NotificationEvent.objects.count(),
            },
            "lastUpdatedAt": timezone.now().isoformat(),
        }
    )


def serialize_evidence(asset):
    return {
        "id": asset.id,
        "kind": asset.kind,
        "uri": asset.uri,
        "capturedAt": asset.captured_at.isoformat(),
        "qualityNote": asset.quality_note,
    }


def serialize_alert(alert, detail=False):
    payload = {
        "id": alert.id,
        "alertType": alert.alert_type,
        "alertTypeLabel": alert.get_alert_type_display(),
        "status": alert.status,
        "summary": alert.summary,
        "occurredAt": alert.occurred_at.isoformat(),
        "window": {
            "startedAt": alert.window_started_at.isoformat(),
            "endedAt": alert.window_ended_at.isoformat(),
        },
        "confidenceScore": float(alert.confidence_score),
        "visibilityQuality": alert.visibility_quality,
        "examSession": {
            "id": alert.exam_session.id,
            "course": alert.exam_session.course.code,
            "courseTitle": alert.exam_session.course.title,
            "hall": alert.exam_session.hall.name,
            "status": alert.exam_session.status,
        },
        "camera": {"id": alert.camera.id, "name": alert.camera.name, "status": alert.camera.status},
        "seat": {"id": alert.seat.id, "label": alert.seat.label} if alert.seat else None,
    }
    if detail:
        payload["evidenceAssets"] = [serialize_evidence(asset) for asset in alert.evidence_assets.all()]
        payload["reviewActions"] = [
            {
                "id": action.id,
                "reviewer": action.reviewer.username if action.reviewer else "system",
                "decision": action.decision,
                "note": action.note,
                "createdAt": action.created_at.isoformat(),
            }
            for action in alert.review_actions.select_related("reviewer")
        ]
    return payload


def alerts(_request):
    queryset = AlertEvent.objects.select_related(
        "exam_session",
        "exam_session__course",
        "exam_session__hall",
        "camera",
        "seat",
    ).prefetch_related("evidence_assets")
    return JsonResponse({"alerts": [serialize_alert(alert) for alert in queryset]})


def alert_detail(_request, alert_id):
    alert = AlertEvent.objects.select_related(
        "exam_session",
        "exam_session__course",
        "exam_session__hall",
        "camera",
        "seat",
    ).prefetch_related("evidence_assets", "review_actions").get(id=alert_id)
    return JsonResponse({"alert": serialize_alert(alert, detail=True)})


@csrf_exempt
@require_http_methods(["POST"])
def review_alert(request, alert_id):
    data = parse_body(request)
    decision = data.get("decision")
    if decision not in {
        ReviewerAction.DECISION_CONFIRMED,
        ReviewerAction.DECISION_DISMISSED,
        ReviewerAction.DECISION_FOLLOW_UP,
    }:
        return JsonResponse({"error": "Decision must be confirmed, dismissed, or follow_up."}, status=400)

    reviewer = User.objects.filter(username=data.get("reviewerUsername", "invigilator")).first()
    alert = AlertEvent.objects.get(id=alert_id)
    ReviewerAction.objects.create(alert=alert, reviewer=reviewer, decision=decision, note=data.get("note", ""))
    alert.status = decision
    alert.save(update_fields=["status", "updated_at"])
    return JsonResponse({"alert": serialize_alert(alert, detail=True)})


@csrf_exempt
@require_http_methods(["POST"])
def simulate_alert(_request):
    session = ExamSession.objects.filter(status=ExamSession.STATUS_LIVE).select_related("hall").first()
    if not session:
        return JsonResponse({"error": "No live exam session exists. Run seed data first."}, status=409)
    camera = Camera.objects.filter(hall=session.hall, status__in=[Camera.STATUS_ACTIVE, Camera.STATUS_DEGRADED]).first()
    seat = session.hall.seats.first()
    now = timezone.now()
    alert = AlertEvent.objects.create(
        exam_session=session,
        camera=camera,
        seat=seat,
        alert_type=AlertEvent.TYPE_DEVICE,
        occurred_at=now,
        window_started_at=now - timezone.timedelta(seconds=12),
        window_ended_at=now,
        confidence_score=0.88,
        visibility_quality="clear with slight side-angle obstruction",
        status=AlertEvent.STATUS_VISIBLE,
        summary="Device-like rectangle visible near the desk edge for a sustained window.",
    )
    EvidenceAsset.objects.create(
        alert=alert,
        kind=EvidenceAsset.KIND_SNAPSHOT,
        uri=f"evidence://alert-{alert.id}/snapshot",
        captured_at=now,
        quality_note="Synthetic demo evidence reference",
    )
    payload = serialize_alert(alert, detail=True)
    async_to_sync(get_channel_layer().group_send)("alerts", {"type": "alert.created", "payload": payload})
    return JsonResponse({"alert": payload}, status=201)


def risk_dashboard(_request):
    latest_scores = StudentRiskScore.objects.select_related(
        "student", "course", "course__department", "run"
    ).order_by("-run__generated_at", "-risk_score")[:30]
    summaries = (
        StudentRiskScore.objects.values("course__code", "course__title", "risk_level")
        .annotate(count=Count("id"))
        .order_by("course__code", "risk_level")
    )
    return JsonResponse(
        {
            "summaries": list(summaries),
            "scores": [
                {
                    "id": score.id,
                    "student": score.student.full_name,
                    "studentNumber": score.student.student_number,
                    "cohort": score.student.cohort,
                    "course": score.course.code,
                    "courseTitle": score.course.title,
                    "department": score.course.department.code,
                    "riskLevel": score.risk_level,
                    "riskScore": score.risk_score,
                    "contributingFactors": score.contributing_factors,
                    "generatedAt": score.run.generated_at.isoformat(),
                }
                for score in latest_scores
            ],
        }
    )


@csrf_exempt
@require_http_methods(["GET", "POST"])
def imports(request):
    if request.method == "POST":
        data = parse_body(request)
        source_name = data.get("sourceName", "manual-json-import")
        rows = data.get("rows", [])
        semester_course = Course.objects.select_related("semester").first()
        record_import = AcademicRecordImport.objects.create(
            semester=semester_course.semester,
            source_name=source_name,
            status=AcademicRecordImport.STATUS_PENDING,
        )
        issues = []
        imported_rows = 0
        touched_courses = set()
        for row in rows:
            student = StudentProfile.objects.filter(student_number=row.get("studentNumber")).first()
            course = Course.objects.filter(code=row.get("courseCode")).first()
            if not student or not course:
                issues.append(f"Unmatched row for {row.get('studentNumber')} / {row.get('courseCode')}")
                continue
            attendance = row.get("attendance")
            if attendance:
                AttendanceRecord.objects.create(
                    source_import=record_import,
                    student=student,
                    course=course,
                    attended=attendance.get("attended", 0),
                    total=max(attendance.get("total", 1), 1),
                )
            for assessment in row.get("assessments", []):
                AssessmentRecord.objects.create(
                    source_import=record_import,
                    student=student,
                    course=course,
                    label=assessment.get("label", "Assessment"),
                    score=assessment.get("score", 0),
                    max_score=max(assessment.get("maxScore", 100), 1),
                )
            imported_rows += 1
            touched_courses.add(course.id)

        record_import.status = AcademicRecordImport.STATUS_FAILED if issues else AcademicRecordImport.STATUS_VALIDATED
        record_import.issue_summary = "\n".join(issues)
        record_import.imported_rows = imported_rows
        record_import.save()

        if record_import.status == AcademicRecordImport.STATUS_VALIDATED:
            for course_id in touched_courses:
                calculate_risk_run(record_import, Course.objects.get(id=course_id))

        return JsonResponse({"import": serialize_import(record_import)}, status=201)

    return JsonResponse({"imports": [serialize_import(item) for item in AcademicRecordImport.objects.order_by("-created_at")]})


def serialize_import(item):
    return {
        "id": item.id,
        "sourceName": item.source_name,
        "status": item.status,
        "issueSummary": item.issue_summary,
        "importedRows": item.imported_rows,
        "createdAt": item.created_at.isoformat(),
    }


def agenda(request):
    student_number = request.GET.get("studentNumber")
    student = StudentProfile.objects.filter(student_number=student_number).first() if student_number else StudentProfile.objects.first()
    if not student:
        return JsonResponse({"student": None, "agenda": []})
    return JsonResponse(
        {
            "student": {"name": student.full_name, "studentNumber": student.student_number, "cohort": student.cohort},
            "agenda": agenda_for_student(student),
        }
    )


def notifications(_request):
    return JsonResponse(
        {
            "notifications": [
                {
                    "id": item.id,
                    "student": item.student.full_name,
                    "eventType": item.event_type,
                    "scheduleId": item.schedule_id,
                    "channel": item.channel,
                    "scheduledFor": item.scheduled_for.isoformat(),
                    "deliveryState": item.delivery_state,
                    "idempotencyKey": item.idempotency_key,
                }
                for item in NotificationEvent.objects.select_related("student").order_by("-generated_at")[:50]
            ]
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def generate_notifications(_request):
    created = generate_due_notifications()
    return JsonResponse({"created": len(created), "notifications": [item.id for item in created]})


def operations_health(_request):
    return JsonResponse(
        {
            "cameras": [
                {
                    "id": camera.id,
                    "hall": camera.hall.name,
                    "name": camera.name,
                    "status": camera.status,
                    "lastHealthMessage": camera.last_health_message,
                    "lastSeenAt": camera.last_seen_at.isoformat() if camera.last_seen_at else None,
                }
                for camera in Camera.objects.select_related("hall").order_by("hall__name", "name")
            ],
            "components": [
                {
                    "id": health.id,
                    "kind": health.kind,
                    "component": health.component,
                    "state": health.state,
                    "message": health.message,
                    "lastCheckedAt": health.last_checked_at.isoformat(),
                }
                for health in OperationalHealth.objects.order_by("kind", "component")
            ],
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def simulate_health(_request):
    camera = Camera.objects.order_by("?").first()
    if not camera:
        return JsonResponse({"error": "No camera exists. Run seed data first."}, status=409)
    camera.status = Camera.STATUS_DEGRADED if camera.status == Camera.STATUS_ACTIVE else Camera.STATUS_ACTIVE
    camera.last_health_message = "Simulated admin health transition"
    camera.last_seen_at = timezone.now()
    camera.save()
    OperationalHealth.objects.update_or_create(
        kind=OperationalHealth.KIND_CAMERA,
        component=f"{camera.hall.name} / {camera.name}",
        defaults={
            "state": OperationalHealth.STATE_DEGRADED
            if camera.status == Camera.STATUS_DEGRADED
            else OperationalHealth.STATE_HEALTHY,
            "message": camera.last_health_message,
            "last_checked_at": timezone.now(),
        },
    )
    return operations_health(_request)
