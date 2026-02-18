from celery import Celery
from fc_core.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "fusionecore",
    broker=settings.redis_url,
    backend=settings.redis_url
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutos
    task_soft_time_limit=540,  # 9 minutos
)
