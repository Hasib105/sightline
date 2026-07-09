from pathlib import Path
from uuid import uuid4

from django.contrib.auth import authenticate, get_user
from django.contrib.auth.models import User
from django.core.files.storage import default_storage
from django.utils.text import get_valid_filename
from django.utils import timezone
from rest_framework import serializers

from .models import (
    AcademicRecordImport,
    AssessmentRecord,
    AttendanceRecord,
    Course,
    CourseChatMessage,
    CourseChatThread,
    CourseEnrollment,
    CourseMaterial,
    CourseUnit,
    Department,
    ExamAttempt,
    ExamSession,
    ExamVideo,
    ExamVideoAnalysisResult,
    Hall,
    Semester,
    StudentProfile,
    StudentRiskScore,
    UserProfile,
)
from .services import calculate_risk_run


def role_permissions(role):
    if role == UserProfile.ROLE_ADMIN:
        return ["*"]
    if role == UserProfile.ROLE_INVIGILATOR:
        return ["exam_videos.upload", "exam_videos.monitor", "alerts.review"]
    if role == UserProfile.ROLE_TEACHER:
        return ["courses.manage", "exams.manage", "risk.identify", "course_materials.manage"]
    return ["courses.enroll", "exams.take"]


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


def request_user(request):
    return get_user(getattr(request, "_request", request))


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs["identifier"].strip()
        username = identifier
        if "@" in identifier:
            matched_user = User.objects.filter(email__iexact=identifier).first()
            username = matched_user.username if matched_user else identifier

        user = authenticate(
            self.context.get("request"),
            username=username,
            password=attrs["password"],
        )
        if not user:
            raise serializers.ValidationError("Invalid username or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is disabled.")
        attrs["user"] = user
        return attrs


class CurrentUserSerializer(serializers.ModelSerializer):
    primary_provider = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "primary_provider", "role", "is_superuser"]

    def get_primary_provider(self, _user):
        return "password"

    def get_role(self, user):
        profile = getattr(user, "sightline_profile", None)
        return profile.role if profile else UserProfile.ROLE_STUDENT


class AdminUserSerializer(CurrentUserSerializer):
    account_type = serializers.SerializerMethodField()
    staff_role = serializers.SerializerMethodField()
    staff_permissions = serializers.SerializerMethodField()
    can_manage_staff = serializers.SerializerMethodField()
    api_key_count = serializers.SerializerMethodField()
    active_api_key_count = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    monthly_free_credits = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()
    total_search_events = serializers.SerializerMethodField()
    last_activity_at = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source="date_joined")
    updated_at = serializers.DateTimeField(source="date_joined")

    class Meta(CurrentUserSerializer.Meta):
        fields = CurrentUserSerializer.Meta.fields + [
            "is_active",
            "account_type",
            "staff_role",
            "staff_permissions",
            "can_manage_staff",
            "api_key_count",
            "active_api_key_count",
            "balance",
            "monthly_free_credits",
            "subscription_status",
            "total_search_events",
            "last_activity_at",
            "created_at",
            "updated_at",
        ]

    def get_account_type(self, user):
        return "staff" if self.get_role(user) == UserProfile.ROLE_ADMIN else "client"

    def get_staff_role(self, user):
        return "admin" if self.get_role(user) == UserProfile.ROLE_ADMIN else None

    def get_staff_permissions(self, user):
        return role_permissions(self.get_role(user))

    def get_can_manage_staff(self, user):
        return user.is_superuser or self.get_role(user) == UserProfile.ROLE_ADMIN

    def get_api_key_count(self, _user):
        return 0

    def get_active_api_key_count(self, _user):
        return 0

    def get_balance(self, _user):
        return 0

    def get_monthly_free_credits(self, _user):
        return 0

    def get_subscription_status(self, _user):
        return None

    def get_total_search_events(self, _user):
        return 0

    def get_last_activity_at(self, user):
        return user.last_login


class AdminUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField()
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(default="sightline", write_only=True)
    role = serializers.CharField(default=UserProfile.ROLE_STUDENT)
    is_active = serializers.BooleanField(default=True)

    def validate_username(self, value):
        username = value.strip()
        if not username:
            raise serializers.ValidationError("Username is required.")
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError("Username already exists.")
        return username

    def create(self, validated_data):
        role = parse_role(validated_data.get("role"))
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", "").strip(),
            password=validated_data.get("password") or "sightline",
            is_active=validated_data.get("is_active", True),
        )
        ensure_profile(user, role)
        return user


class AdminUserUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    role = serializers.CharField(required=False)

    def update(self, user, validated_data):
        request = self.context.get("request")
        if "email" in validated_data:
            user.email = validated_data["email"].strip()
        if "is_active" in validated_data and (not request or user.id != request_user(request).id):
            user.is_active = validated_data["is_active"]
        if "role" in validated_data:
            ensure_profile(user, parse_role(validated_data["role"]))
        user.save()
        return user


class PasswordSetSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)

    def update(self, user, validated_data):
        user.set_password(validated_data["password"])
        user.save()
        return user


def default_department():
    return Department.objects.order_by("id").first() or Department.objects.create(
        code="GEN",
        name="General",
    )


def default_semester():
    today = timezone.now().date()
    return Semester.objects.order_by("-starts_on").first() or Semester.objects.create(
        name="Current Semester",
        starts_on=today,
        ends_on=today.replace(year=today.year + 1),
    )


def default_hall():
    return Hall.objects.order_by("id").first() or Hall.objects.create(
        name="Default Hall",
        building="Main",
        capacity=60,
    )


def _save_uploaded_file(storage_name: str, upload) -> str:
    if hasattr(upload, "chunks"):
        with default_storage.open(storage_name, "wb") as destination:
            for chunk in upload.chunks():
                if chunk:
                    destination.write(chunk)
        return storage_name
    return default_storage.save(storage_name, upload)


def default_upload_exam_session():
    semester = default_semester()
    course, _ = Course.objects.get_or_create(
        semester=semester,
        code="VIDEO-UPLOAD",
        defaults={
            "department": default_department(),
            "title": "Uploaded Video Review",
        },
    )
    session = ExamSession.objects.filter(course=course, quiz_title="Uploaded Video Review").order_by("id").first()
    if session:
        return session
    starts_at = timezone.now()
    return ExamSession.objects.create(
        course=course,
        hall=default_hall(),
        starts_at=starts_at,
        ends_at=starts_at + timezone.timedelta(hours=2),
        status=ExamSession.STATUS_PREPARED,
        quiz_title="Uploaded Video Review",
        quiz_instructions="Automatically assigned context for invigilator uploaded videos.",
    )


def student_for_user(user):
    return StudentProfile.objects.filter(user=user).first()


class CourseSerializer(serializers.ModelSerializer):
    teacher_username = serializers.CharField(source="teacher.username", read_only=True)
    department_code = serializers.CharField(source="department.code", read_only=True)
    semester_name = serializers.CharField(source="semester.name", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "code",
            "title",
            "teacher",
            "teacher_username",
            "department",
            "department_code",
            "semester",
            "semester_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["teacher", "department", "semester", "created_at", "updated_at"]

    def create(self, validated_data):
        request = self.context["request"]
        validated_data.setdefault("teacher", request_user(request))
        validated_data.setdefault("department", default_department())
        validated_data.setdefault("semester", default_semester())
        return super().create(validated_data)


class CourseUnitSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)
    material_count = serializers.IntegerField(source="materials.count", read_only=True)

    class Meta:
        model = CourseUnit
        fields = [
            "id",
            "course",
            "course_code",
            "title",
            "summary",
            "order",
            "material_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["course", "created_at", "updated_at"]

    def create(self, validated_data):
        course = self.context.get("course")
        if course:
            validated_data["course"] = course
        return super().create(validated_data)


class CourseMaterialSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    unit_title = serializers.CharField(source="unit.title", read_only=True)
    unit_order = serializers.IntegerField(source="unit.order", read_only=True)
    uploaded_by_username = serializers.CharField(source="uploaded_by.username", read_only=True)
    file = serializers.FileField(write_only=True, required=False)
    uri = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = CourseMaterial
        fields = [
            "id",
            "course",
            "course_code",
            "course_title",
            "unit",
            "unit_title",
            "unit_order",
            "uploaded_by",
            "uploaded_by_username",
            "kind",
            "title",
            "description",
            "content_text",
            "uri",
            "file",
            "original_filename",
            "order",
            "indexed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["course", "uploaded_by", "indexed_at", "created_at", "updated_at"]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        course = self.context.get("course") or getattr(self.instance, "course", None)
        unit = attrs.get("unit")
        if unit and course and unit.course_id != course.id:
            raise serializers.ValidationError("Unit must belong to the selected course.")
        if self.instance is None and not attrs.get("uri") and not attrs.get("file") and not attrs.get("content_text"):
            raise serializers.ValidationError("Provide text, a URI, or an uploaded file.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        upload = validated_data.pop("file", None)
        course = self.context.get("course")
        if course:
            validated_data["course"] = course
        validated_data["uploaded_by"] = request_user(request)
        if upload is not None:
            original_filename = get_valid_filename(Path(upload.name).name or "course-material")
            extension = Path(original_filename).suffix.lower()
            storage_name = f"course_materials/{uuid4().hex}{extension}"
            validated_data["uri"] = default_storage.save(storage_name, upload)
            validated_data.setdefault("original_filename", original_filename)
        return super().create(validated_data)


class CourseChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseChatMessage
        fields = ["id", "role", "content", "citations", "created_at"]


class CourseChatThreadSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)
    unit_title = serializers.CharField(source="unit.title", read_only=True)
    messages = CourseChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = CourseChatThread
        fields = [
            "id",
            "course",
            "course_code",
            "unit",
            "unit_title",
            "title",
            "messages",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class CourseEnrollmentSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_number = serializers.CharField(source="student.student_number", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)

    class Meta:
        model = CourseEnrollment
        fields = [
            "id",
            "course",
            "course_code",
            "course_title",
            "student",
            "student_number",
            "student_name",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["student", "created_at", "updated_at"]


class ExamSessionSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    hall_name = serializers.CharField(source="hall.name", read_only=True)

    class Meta:
        model = ExamSession
        fields = [
            "id",
            "course",
            "course_code",
            "course_title",
            "hall",
            "hall_name",
            "starts_at",
            "ends_at",
            "status",
            "quiz_title",
            "quiz_instructions",
            "quiz_questions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["hall", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data.setdefault("hall", default_hall())
        return super().create(validated_data)


class ExamVideoSerializer(serializers.ModelSerializer):
    exam_session = serializers.PrimaryKeyRelatedField(queryset=ExamSession.objects.all(), required=False)
    uploaded_by_username = serializers.CharField(source="uploaded_by.username", read_only=True)
    exam_course = serializers.CharField(source="exam_session.course.code", read_only=True)
    original_filename = serializers.CharField(required=False, allow_blank=True)
    file_uri = serializers.CharField(required=False, allow_blank=True)
    file = serializers.FileField(write_only=True, required=False)
    file_url = serializers.SerializerMethodField()
    alert_count = serializers.IntegerField(source="alerts.count", read_only=True)
    result = serializers.SerializerMethodField()

    class Meta:
        model = ExamVideo
        fields = [
            "id",
            "exam_session",
            "exam_course",
            "uploaded_by",
            "uploaded_by_username",
            "original_filename",
            "file_uri",
            "file",
            "file_url",
            "status",
            "notes",
            "analysis_started_at",
            "analysis_completed_at",
            "frames_analyzed",
            "duration_seconds",
            "error_message",
            "analysis_report",
            "result",
            "alert_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "uploaded_by",
            "file_url",
            "status",
            "analysis_started_at",
            "analysis_completed_at",
            "frames_analyzed",
            "duration_seconds",
            "error_message",
            "analysis_report",
            "result",
            "alert_count",
            "created_at",
            "updated_at",
        ]

    def get_file_url(self, video):
        if not video.file_uri:
            return ""
        if video.file_uri.startswith(("http://", "https://", "/", "file://")):
            return video.file_uri
        return default_storage.url(video.file_uri)

    def get_result(self, video):
        result = getattr(video, "result", None)
        if result is None:
            return None
        return ExamVideoAnalysisResultSerializer(result).data

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance is None and not attrs.get("file") and not attrs.get("file_uri"):
            raise serializers.ValidationError("Upload a video file or provide file_uri.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        upload = validated_data.pop("file", None)
        validated_data.setdefault("exam_session", default_upload_exam_session())
        validated_data["uploaded_by"] = request_user(request)
        if upload is not None:
            original_filename = get_valid_filename(Path(upload.name).name or "exam-video.mp4")
            extension = Path(original_filename).suffix.lower() or ".mp4"
            storage_name = f"exam_videos/{uuid4().hex}{extension}"
            validated_data["file_uri"] = _save_uploaded_file(storage_name, upload)
            validated_data.setdefault("original_filename", original_filename)
        return super().create(validated_data)


class ExamVideoAnalysisResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamVideoAnalysisResult
        fields = [
            "id",
            "model_name",
            "report_uri",
            "session_uri",
            "annotated_video_uri",
            "latest_preview_uri",
            "frames_analyzed",
            "current_frame",
            "total_frames",
            "progress_percent",
            "duration_seconds",
            "total_alerts",
            "alert_counts",
            "latest_status",
            "created_at",
            "updated_at",
        ]

class ExamAttemptSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="exam_session.course.code", read_only=True)
    student_number = serializers.CharField(source="student.student_number", read_only=True)

    class Meta:
        model = ExamAttempt
        fields = [
            "id",
            "exam_session",
            "course_code",
            "student",
            "student_number",
            "status",
            "answers",
            "submitted_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["student", "submitted_at", "created_at", "updated_at"]

    def create(self, validated_data):
        request = self.context["request"]
        student = student_for_user(request_user(request))
        if not student:
            raise serializers.ValidationError("Student profile not found for this user.")
        validated_data["student"] = student
        validated_data["status"] = ExamAttempt.STATUS_SUBMITTED
        validated_data["submitted_at"] = timezone.now()
        return super().create(validated_data)


class StudentRiskScoreSerializer(serializers.ModelSerializer):
    student_number = serializers.CharField(source="student.student_number", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)

    class Meta:
        model = StudentRiskScore
        fields = [
            "id",
            "student",
            "student_number",
            "student_name",
            "course",
            "course_code",
            "risk_level",
            "risk_score",
            "contributing_factors",
            "created_at",
            "updated_at",
        ]


class AtRiskRunSerializer(serializers.Serializer):
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all())
    source_name = serializers.CharField(default="manual-risk-input")
    rows = serializers.ListField(child=serializers.DictField(), allow_empty=False)

    def create(self, validated_data):
        request = self.context["request"]
        course = validated_data["course"]
        record_import = AcademicRecordImport.objects.create(
            semester=course.semester,
            uploaded_by=request_user(request),
            source_name=validated_data["source_name"],
            status=AcademicRecordImport.STATUS_VALIDATED,
            imported_rows=len(validated_data["rows"]),
        )
        for row in validated_data["rows"]:
            student = StudentProfile.objects.filter(student_number=row.get("student_number") or row.get("studentNumber")).first()
            if not student:
                continue
            attendance = row.get("attendance") or {}
            AttendanceRecord.objects.create(
                source_import=record_import,
                student=student,
                course=course,
                attended=attendance.get("attended", row.get("attended", 0)),
                total=max(attendance.get("total", row.get("total", 1)), 1),
            )
            assessment = row.get("assessment") or {}
            AssessmentRecord.objects.create(
                source_import=record_import,
                student=student,
                course=course,
                label=assessment.get("label", row.get("label", "Assessment")),
                score=assessment.get("score", row.get("score", 0)),
                max_score=max(assessment.get("max_score", row.get("max_score", row.get("maxScore", 100))), 1),
            )
        return calculate_risk_run(record_import, course)
