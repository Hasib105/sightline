from django.contrib import admin
from django.urls import include, path

from sightline import views


urlpatterns = [
    path("admin/", admin.site.urls),
    path("auth/login", views.LoginView.as_view()),
    path("auth/logout", views.LogoutView.as_view()),
    path("api/v1/me", views.CurrentUserView.as_view()),
    path("api/v1/", views.ApiV1DispatchView.as_view()),
    path("api/v1/<path:path>", views.ApiV1DispatchView.as_view()),
    path("api/", include("sightline.urls")),
]
