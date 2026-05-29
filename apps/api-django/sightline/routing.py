from django.urls import path

from .consumers import AlertConsumer, ExamVideoAnalysisConsumer

websocket_urlpatterns = [
    path("ws/alerts/", AlertConsumer.as_asgi()),
    path("ws/exam-videos/<int:video_id>/analysis/", ExamVideoAnalysisConsumer.as_asgi()),
]
