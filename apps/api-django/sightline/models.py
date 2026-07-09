from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Department(TimestampedModel):
    name = models.CharField(max_length=160, unique=True)
    code = models.CharField(max_length=24, unique=True)

    def __str__(self):
        return self.code


class Semester(TimestampedModel):
    name = models.CharField(max_length=120)
    starts_on = models.DateField()
    ends_on = models.DateField()

    def __str__(self):
        return self.name


class Course(TimestampedModel):
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="courses")
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name="courses")
    teacher = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="teaching_courses")
    code = models.CharField(max_length=32)
    title = models.CharField(max_length=180)

    class Meta:
        unique_together = ("semester", "code")

    def __str__(self):
        return f"{self.code} - {self.title}"


class CourseUnit(TimestampedModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="units")
    title = models.CharField(max_length=180)
    summary = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("course__code", "order", "id")
        unique_together = ("course", "order")

    def __str__(self):
        return f"{self.course.code} / Unit {self.order}: {self.title}"


class CourseMaterial(TimestampedModel):
    KIND_TEXT = "text"
    KIND_VIDEO = "video"
    KIND_SLIDE = "slide"
    KIND_PDF = "pdf"
    KIND_DOC = "doc"
    KIND_EMBED = "embed"
    KIND_URL = "url"
    KIND_CHOICES = [
        (KIND_TEXT, "Text"),
        (KIND_VIDEO, "Video"),
        (KIND_SLIDE, "Slide"),
        (KIND_PDF, "PDF"),
        (KIND_DOC, "Document"),
        (KIND_EMBED, "Embed"),
        (KIND_URL, "URL"),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="materials")
    unit = models.ForeignKey(CourseUnit, null=True, blank=True, on_delete=models.CASCADE, related_name="materials")
    uploaded_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    kind = models.CharField(max_length=24, choices=KIND_CHOICES)
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    content_text = models.TextField(blank=True)
    uri = models.CharField(max_length=300)
    original_filename = models.CharField(max_length=180, blank=True)
    order = models.PositiveIntegerField(default=1)
    indexed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("unit__order", "order", "-created_at")

    def __str__(self):
        return f"{self.course.code} - {self.title}"


class CourseChatThread(TimestampedModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="chat_threads")
    unit = models.ForeignKey(CourseUnit, null=True, blank=True, on_delete=models.SET_NULL, related_name="chat_threads")
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="course_chat_threads")
    title = models.CharField(max_length=180)
    checkpoint_thread_id = models.CharField(max_length=120, unique=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self):
        return f"{self.title} ({self.course.code})"


class CourseChatMessage(TimestampedModel):
    ROLE_USER = "user"
    ROLE_ASSISTANT = "assistant"
    ROLE_SYSTEM = "system"
    ROLE_CHOICES = [
        (ROLE_USER, "User"),
        (ROLE_ASSISTANT, "Assistant"),
        (ROLE_SYSTEM, "System"),
    ]

    thread = models.ForeignKey(CourseChatThread, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=16, choices=ROLE_CHOICES)
    content = models.TextField()
    citations = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ("created_at", "id")

    def __str__(self):
        return f"{self.role} message in {self.thread_id}"


class UserProfile(TimestampedModel):
    ROLE_ADMIN = "admin"
    ROLE_TEACHER = "teacher"
    ROLE_INVIGILATOR = "invigilator"
    ROLE_STUDENT = "student"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Admin"),
        (ROLE_TEACHER, "Teacher"),
        (ROLE_INVIGILATOR, "Invigilator"),
        (ROLE_STUDENT, "Student"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="sightline_profile")
    role = models.CharField(max_length=32, choices=ROLE_CHOICES)
    department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class StudentProfile(TimestampedModel):
    user = models.OneToOneField(User, null=True, blank=True, on_delete=models.SET_NULL)
    department = models.ForeignKey(Department, on_delete=models.PROTECT)
    student_number = models.CharField(max_length=48, unique=True)
    full_name = models.CharField(max_length=160)
    cohort = models.CharField(max_length=80)
    # Prior cumulative GPA (0-4 scale) used as an ML feature for failure prediction.
    previous_gpa = models.DecimalField(max_digits=3, decimal_places=2, default=0)

    def __str__(self):
        return self.full_name


class CourseEnrollment(TimestampedModel):
    STATUS_ACTIVE = "active"
    STATUS_DROPPED = "dropped"
    STATUS_COMPLETED = "completed"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_DROPPED, "Dropped"),
        (STATUS_COMPLETED, "Completed"),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="enrollments")
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default=STATUS_ACTIVE)

    class Meta:
        unique_together = ("course", "student")

    def __str__(self):
        return f"{self.student} -> {self.course}"


class FacultyProfile(TimestampedModel):
    user = models.OneToOneField(User, null=True, blank=True, on_delete=models.SET_NULL)
    department = models.ForeignKey(Department, on_delete=models.PROTECT)
    full_name = models.CharField(max_length=160)

    def __str__(self):
        return self.full_name


class Hall(TimestampedModel):
    name = models.CharField(max_length=120)
    building = models.CharField(max_length=120)
    capacity = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.name


class Camera(TimestampedModel):
    STATUS_PROVISIONED = "provisioned"
    STATUS_ACTIVE = "active"
    STATUS_DEGRADED = "degraded"
    STATUS_DISABLED = "disabled"
    STATUS_CHOICES = [
        (STATUS_PROVISIONED, "Provisioned"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_DEGRADED, "Degraded"),
        (STATUS_DISABLED, "Disabled"),
    ]

    hall = models.ForeignKey(Hall, on_delete=models.CASCADE, related_name="cameras")
    name = models.CharField(max_length=120)
    stream_url = models.CharField(max_length=240)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_PROVISIONED)
    last_health_message = models.CharField(max_length=240, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.hall.name} / {self.name}"


class Seat(TimestampedModel):
    hall = models.ForeignKey(Hall, on_delete=models.CASCADE, related_name="seats")
    label = models.CharField(max_length=32)
    region = models.CharField(max_length=120, blank=True)

    class Meta:
        unique_together = ("hall", "label")

    def __str__(self):
        return f"{self.hall.name} {self.label}"


class ExamSession(TimestampedModel):
    STATUS_SCHEDULED = "scheduled"
    STATUS_PREPARED = "prepared"
    STATUS_LIVE = "live"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_PREPARED, "Prepared"),
        (STATUS_LIVE, "Live"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    course = models.ForeignKey(Course, on_delete=models.PROTECT)
    hall = models.ForeignKey(Hall, on_delete=models.PROTECT)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    quiz_title = models.CharField(max_length=180, blank=True)
    quiz_instructions = models.TextField(blank=True)
    quiz_questions = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.course.code} in {self.hall.name}"


class ExamVideo(TimestampedModel):
    STATUS_UPLOADED = "uploaded"
    STATUS_ANALYZING = "analyzing"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_UPLOADED, "Uploaded"),
        (STATUS_ANALYZING, "Analyzing"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
    ]

    exam_session = models.ForeignKey(ExamSession, on_delete=models.CASCADE, related_name="videos")
    uploaded_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    original_filename = models.CharField(max_length=180)
    file_uri = models.CharField(max_length=300)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    notes = models.TextField(blank=True)
    analysis_started_at = models.DateTimeField(null=True, blank=True)
    analysis_completed_at = models.DateTimeField(null=True, blank=True)
    frames_analyzed = models.PositiveIntegerField(default=0)
    duration_seconds = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    error_message = models.TextField(blank=True)
    analysis_report = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.original_filename} ({self.exam_session})"


class ExamVideoAnalysisResult(TimestampedModel):
    exam_video = models.OneToOneField(ExamVideo, on_delete=models.CASCADE, related_name="result")
    model_name = models.CharField(max_length=80)
    report_uri = models.CharField(max_length=300, blank=True)
    session_uri = models.CharField(max_length=300, blank=True)
    annotated_video_uri = models.CharField(max_length=300, blank=True)
    latest_preview_uri = models.CharField(max_length=300, blank=True)
    frames_analyzed = models.PositiveIntegerField(default=0)
    current_frame = models.PositiveIntegerField(default=0)
    total_frames = models.PositiveIntegerField(default=0)
    progress_percent = models.PositiveIntegerField(default=0)
    duration_seconds = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_alerts = models.PositiveIntegerField(default=0)
    alert_counts = models.JSONField(default=dict, blank=True)
    latest_status = models.CharField(max_length=180, blank=True)
    report_payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"Analysis result for {self.exam_video.original_filename}"


class ExamAttempt(TimestampedModel):
    STATUS_STARTED = "started"
    STATUS_SUBMITTED = "submitted"
    STATUS_REVIEWED = "reviewed"
    STATUS_CHOICES = [
        (STATUS_STARTED, "Started"),
        (STATUS_SUBMITTED, "Submitted"),
        (STATUS_REVIEWED, "Reviewed"),
    ]

    exam_session = models.ForeignKey(ExamSession, on_delete=models.CASCADE, related_name="attempts")
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="exam_attempts")
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default=STATUS_STARTED)
    answers = models.JSONField(default=dict)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("exam_session", "student")

    def __str__(self):
        return f"{self.student} / {self.exam_session}"


class AlertEvent(TimestampedModel):
    TYPE_LOOK_AWAY = "look_away"
    TYPE_NEIGHBORING_DESK = "neighboring_desk"
    TYPE_DEVICE = "unauthorized_device"
    TYPE_CHOICES = [
        (TYPE_LOOK_AWAY, "Repeated look-away"),
        (TYPE_NEIGHBORING_DESK, "Looking toward neighboring desk"),
        (TYPE_DEVICE, "Unauthorized device presence"),
    ]
    STATUS_DETECTED = "detected"
    STATUS_VISIBLE = "visible"
    STATUS_CONFIRMED = "confirmed"
    STATUS_DISMISSED = "dismissed"
    STATUS_FOLLOW_UP = "follow_up"
    STATUS_CLOSED = "closed"
    STATUS_CHOICES = [
        (STATUS_DETECTED, "Detected"),
        (STATUS_VISIBLE, "Visible"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_DISMISSED, "Dismissed"),
        (STATUS_FOLLOW_UP, "Follow-up"),
        (STATUS_CLOSED, "Closed"),
    ]

    exam_session = models.ForeignKey(ExamSession, on_delete=models.CASCADE, related_name="alerts")
    exam_video = models.ForeignKey(ExamVideo, null=True, blank=True, on_delete=models.CASCADE, related_name="alerts")
    camera = models.ForeignKey(Camera, on_delete=models.PROTECT)
    seat = models.ForeignKey(Seat, null=True, blank=True, on_delete=models.SET_NULL)
    alert_type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    occurred_at = models.DateTimeField(default=timezone.now)
    window_started_at = models.DateTimeField(default=timezone.now)
    window_ended_at = models.DateTimeField(default=timezone.now)
    confidence_score = models.DecimalField(max_digits=4, decimal_places=2)
    visibility_quality = models.CharField(max_length=80, default="clear")
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_VISIBLE)
    summary = models.CharField(max_length=240)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-occurred_at",)

    def __str__(self):
        return f"{self.alert_type} at {self.occurred_at:%H:%M}"


class EvidenceAsset(TimestampedModel):
    KIND_SNAPSHOT = "snapshot"
    KIND_CLIP = "clip"
    KIND_CHOICES = [(KIND_SNAPSHOT, "Snapshot"), (KIND_CLIP, "Clip")]

    alert = models.ForeignKey(AlertEvent, on_delete=models.CASCADE, related_name="evidence_assets")
    kind = models.CharField(max_length=24, choices=KIND_CHOICES)
    uri = models.CharField(max_length=300)
    captured_at = models.DateTimeField(default=timezone.now)
    quality_note = models.CharField(max_length=180, blank=True)


class ReviewerAction(TimestampedModel):
    DECISION_CONFIRMED = "confirmed"
    DECISION_DISMISSED = "dismissed"
    DECISION_FOLLOW_UP = "follow_up"
    DECISION_CHOICES = [
        (DECISION_CONFIRMED, "Confirmed"),
        (DECISION_DISMISSED, "Dismissed"),
        (DECISION_FOLLOW_UP, "Follow-up"),
    ]

    alert = models.ForeignKey(AlertEvent, on_delete=models.CASCADE, related_name="review_actions")
    reviewer = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    decision = models.CharField(max_length=32, choices=DECISION_CHOICES)
    note = models.TextField(blank=True)


class AcademicRecordImport(TimestampedModel):
    STATUS_PENDING = "pending"
    STATUS_VALIDATED = "validated"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_VALIDATED, "Validated"),
        (STATUS_FAILED, "Failed"),
    ]

    semester = models.ForeignKey(Semester, on_delete=models.PROTECT)
    uploaded_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    source_name = models.CharField(max_length=160)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default=STATUS_PENDING)
    issue_summary = models.TextField(blank=True)
    imported_rows = models.PositiveIntegerField(default=0)


class AttendanceRecord(TimestampedModel):
    source_import = models.ForeignKey(AcademicRecordImport, on_delete=models.CASCADE)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    attended = models.PositiveIntegerField()
    total = models.PositiveIntegerField()

    @property
    def rate(self):
        return 0 if self.total == 0 else round((self.attended / self.total) * 100, 1)


class AssessmentRecord(TimestampedModel):
    source_import = models.ForeignKey(AcademicRecordImport, on_delete=models.CASCADE)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    label = models.CharField(max_length=120)
    score = models.DecimalField(max_digits=5, decimal_places=2)
    max_score = models.DecimalField(max_digits=5, decimal_places=2)


class RiskAssessmentRun(TimestampedModel):
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [(STATUS_COMPLETED, "Completed"), (STATUS_FAILED, "Failed")]

    semester = models.ForeignKey(Semester, on_delete=models.PROTECT)
    course = models.ForeignKey(Course, on_delete=models.PROTECT)
    source_import = models.ForeignKey(AcademicRecordImport, on_delete=models.PROTECT)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES)
    generated_at = models.DateTimeField(default=timezone.now)
    model_name = models.CharField(max_length=80, blank=True)
    # Global feature importances from the fitted model: {feature_key: weight}.
    feature_importance = models.JSONField(default=dict, blank=True)


class StudentRiskScore(TimestampedModel):
    LEVEL_LOW = "low"
    LEVEL_MEDIUM = "medium"
    LEVEL_HIGH = "high"
    LEVEL_CHOICES = [(LEVEL_LOW, "Low"), (LEVEL_MEDIUM, "Medium"), (LEVEL_HIGH, "High")]

    run = models.ForeignKey(RiskAssessmentRun, on_delete=models.CASCADE, related_name="scores")
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    risk_level = models.CharField(max_length=16, choices=LEVEL_CHOICES)
    risk_score = models.PositiveIntegerField()
    contributing_factors = models.JSONField(default=list)
    # Computed 0-1 feature vector fed to the model, kept for the detail page.
    features = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-risk_score", "student__full_name")


class FacultyActionLog(TimestampedModel):
    ACTION_AUTO_EMAIL = "auto_email"
    ACTION_EMAIL = "email"
    ACTION_MEETING = "meeting"
    ACTION_CALL = "call"
    ACTION_NOTE = "note"
    ACTION_CHOICES = [
        (ACTION_AUTO_EMAIL, "Automatic email"),
        (ACTION_EMAIL, "Email"),
        (ACTION_MEETING, "Meeting"),
        (ACTION_CALL, "Call"),
        (ACTION_NOTE, "Note"),
    ]

    faculty = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="faculty_actions")
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="faculty_actions")
    course = models.ForeignKey(Course, null=True, blank=True, on_delete=models.SET_NULL)
    risk_score = models.ForeignKey(StudentRiskScore, null=True, blank=True, on_delete=models.SET_NULL, related_name="actions")
    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.action} for {self.student} ({self.created_at:%Y-%m-%d})"


class ScheduledSession(TimestampedModel):
    """Admin-managed calendar event (a class meeting or an exam sitting).

    One row per event; enrolled students derive their timetable from the course.
    Room = hall, invigilator = optional assigned proctor. Conflict detection runs
    over this single table (see services.scheduling_conflicts).
    """

    KIND_CLASS = "class"
    KIND_EXAM = "exam"
    KIND_CHOICES = [(KIND_CLASS, "Class"), (KIND_EXAM, "Exam")]

    kind = models.CharField(max_length=16, choices=KIND_CHOICES, default=KIND_CLASS)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="scheduled_sessions")
    hall = models.ForeignKey(Hall, on_delete=models.PROTECT, related_name="scheduled_sessions")
    invigilator = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="invigilating_sessions"
    )
    title = models.CharField(max_length=180, blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()

    class Meta:
        ordering = ("starts_at", "id")

    def __str__(self):
        return f"{self.kind} {self.course.code} @ {self.hall.name} ({self.starts_at:%Y-%m-%d %H:%M})"


class ClassSchedule(TimestampedModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="class_schedules")
    hall = models.ForeignKey(Hall, on_delete=models.PROTECT)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()


class ExamSchedule(TimestampedModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="exam_schedules")
    hall = models.ForeignKey(Hall, on_delete=models.PROTECT)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()


class ReminderRule(TimestampedModel):
    EVENT_CLASS = "class"
    EVENT_EXAM = "exam"
    CHANNEL_IN_APP = "in_app"
    CHANNEL_EMAIL = "email"
    EVENT_CHOICES = [(EVENT_CLASS, "Class"), (EVENT_EXAM, "Exam")]
    CHANNEL_CHOICES = [(CHANNEL_IN_APP, "In-app"), (CHANNEL_EMAIL, "Email")]

    event_type = models.CharField(max_length=16, choices=EVENT_CHOICES)
    channel = models.CharField(max_length=16, choices=CHANNEL_CHOICES)
    minutes_before = models.PositiveIntegerField()
    active = models.BooleanField(default=True)


class NotificationEvent(TimestampedModel):
    STATE_SCHEDULED = "scheduled"
    STATE_DELIVERED = "delivered"
    STATE_ACKNOWLEDGED = "acknowledged"
    STATE_FAILED = "failed"
    STATE_CHOICES = [
        (STATE_SCHEDULED, "Scheduled"),
        (STATE_DELIVERED, "Delivered"),
        (STATE_ACKNOWLEDGED, "Acknowledged"),
        (STATE_FAILED, "Failed"),
    ]

    recipient = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
    event_type = models.CharField(max_length=16)
    schedule_id = models.PositiveIntegerField()
    channel = models.CharField(max_length=16)
    scheduled_for = models.DateTimeField()
    generated_at = models.DateTimeField(default=timezone.now)
    delivery_state = models.CharField(max_length=24, choices=STATE_CHOICES)
    idempotency_key = models.CharField(max_length=180, unique=True)


class OperationalHealth(TimestampedModel):
    KIND_CAMERA = "camera"
    KIND_INFERENCE = "inference"
    KIND_IMPORT = "import"
    KIND_REMINDER = "reminder"
    KIND_CHOICES = [
        (KIND_CAMERA, "Camera"),
        (KIND_INFERENCE, "Inference"),
        (KIND_IMPORT, "Import"),
        (KIND_REMINDER, "Reminder"),
    ]
    STATE_HEALTHY = "healthy"
    STATE_DEGRADED = "degraded"
    STATE_FAILED = "failed"
    STATE_CHOICES = [(STATE_HEALTHY, "Healthy"), (STATE_DEGRADED, "Degraded"), (STATE_FAILED, "Failed")]

    component = models.CharField(max_length=120)
    kind = models.CharField(max_length=24, choices=KIND_CHOICES)
    state = models.CharField(max_length=24, choices=STATE_CHOICES)
    message = models.CharField(max_length=240)
    last_checked_at = models.DateTimeField(default=timezone.now)
