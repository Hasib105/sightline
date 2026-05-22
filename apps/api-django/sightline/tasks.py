from celery import shared_task

from .services import generate_due_notifications


@shared_task
def generate_due_notifications_task():
    return len(generate_due_notifications())

