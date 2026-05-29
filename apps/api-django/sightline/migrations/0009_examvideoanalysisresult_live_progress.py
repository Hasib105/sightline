from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sightline", "0008_alertevent_metadata"),
    ]

    operations = [
        migrations.AddField(
            model_name="examvideoanalysisresult",
            name="current_frame",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="examvideoanalysisresult",
            name="latest_preview_uri",
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name="examvideoanalysisresult",
            name="latest_status",
            field=models.CharField(blank=True, max_length=180),
        ),
        migrations.AddField(
            model_name="examvideoanalysisresult",
            name="progress_percent",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="examvideoanalysisresult",
            name="total_frames",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
