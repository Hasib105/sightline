from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

from sightline import views


urlpatterns = [
    path("admin/", admin.site.urls),
    path("auth/login", views.LoginView.as_view()),
    path("auth/logout", views.LogoutView.as_view()),
    path("api/v1/me", views.CurrentUserView.as_view()),
    path("api/v1/at-risk/reset", views.AtRiskResetView.as_view()),
    path("api/v1/schedules/generate", views.ScheduleGenerateView.as_view()),
    path("api/v1/schedules/bulk", views.ScheduleBulkView.as_view()),
    path("api/v1/schedules/clear", views.ScheduleClearView.as_view()),
    path("api/v1/", views.ApiV1DispatchView.as_view()),
    path("api/v1/<path:path>", views.ApiV1DispatchView.as_view()),
    path("api/", include("sightline.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
