from django.apps import AppConfig


class SightlineConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "sightline"

    def ready(self) -> None:
        from .tasks import schedule_startup_warmup

        schedule_startup_warmup()
