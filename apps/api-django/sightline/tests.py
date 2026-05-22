from django.core.management import call_command
from django.test import Client, TestCase

from .models import NotificationEvent


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

