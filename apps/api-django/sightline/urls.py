from django.urls import path

from . import views

urlpatterns = [
    path("", views.api_root),
    path("overview/", views.overview),
    path("personas/", views.personas),
    path("integrity/alerts/", views.alerts),
    path("integrity/alerts/<int:alert_id>/", views.alert_detail),
    path("integrity/alerts/<int:alert_id>/review/", views.review_alert),
    path("integrity/simulate-alert/", views.simulate_alert),
    path("analytics/risk/", views.risk_dashboard),
    path("analytics/imports/", views.imports),
    path("schedules/agenda/", views.agenda),
    path("notifications/", views.notifications),
    path("notifications/generate/", views.generate_notifications),
    path("operations/health/", views.operations_health),
    path("operations/health/simulate/", views.simulate_health),
]

