from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sightline", "0007_examvideoanalysisresult"),
    ]

    operations = [
        migrations.AddField(
            model_name="alertevent",
            name="metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
