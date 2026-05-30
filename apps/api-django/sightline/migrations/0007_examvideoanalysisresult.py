from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("sightline", "0006_alertevent_exam_video_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExamVideoAnalysisResult",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("model_name", models.CharField(max_length=80)),
                ("report_uri", models.CharField(blank=True, max_length=300)),
                ("session_uri", models.CharField(blank=True, max_length=300)),
                ("annotated_video_uri", models.CharField(blank=True, max_length=300)),
                ("frames_analyzed", models.PositiveIntegerField(default=0)),
                ("duration_seconds", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("total_alerts", models.PositiveIntegerField(default=0)),
                ("alert_counts", models.JSONField(blank=True, default=dict)),
                ("report_payload", models.JSONField(blank=True, default=dict)),
                (
                    "exam_video",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="result",
                        to="sightline.examvideo",
                    ),
                ),
            ],
            options={
                "ordering": ("-created_at",),
            },
        ),
    ]
