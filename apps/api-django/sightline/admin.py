from django.contrib import admin

from . import models


for model in [
    models.Department,
    models.Semester,
    models.Course,
    models.CourseUnit,
    models.CourseMaterial,
    models.CourseChatThread,
    models.CourseChatMessage,
    models.CourseEnrollment,
    models.UserProfile,
    models.StudentProfile,
    models.FacultyProfile,
    models.Hall,
    models.Camera,
    models.Seat,
    models.ExamSession,
    models.ExamVideo,
    models.ExamVideoAnalysisResult,
    models.ExamAttempt,
    models.AlertEvent,
    models.EvidenceAsset,
    models.ReviewerAction,
    models.AcademicRecordImport,
    models.AttendanceRecord,
    models.AssessmentRecord,
    models.RiskAssessmentRun,
    models.StudentRiskScore,
    models.ClassSchedule,
    models.ExamSchedule,
    models.ReminderRule,
    models.NotificationEvent,
    models.OperationalHealth,
]:
    admin.site.register(model)
