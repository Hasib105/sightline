from pathlib import Path
import os
from urllib.parse import parse_qs, unquote, urlparse
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load root .env file if present (development convenience)
env_path = BASE_DIR.parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

SECRET_KEY = os.environ.get("SIGHTLINE_SECRET_KEY", "dev-only-sightline-secret")
DEBUG = os.environ.get("SIGHTLINE_DEBUG", "1") == "1"
ALLOWED_HOSTS = sorted(
    {
        host.strip()
        for host in os.environ.get("SIGHTLINE_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",")
        if host.strip()
    }
    | {"localhost", "127.0.0.1", "testserver"}
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "channels",
    "sightline",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "sightline_api.urls"
ASGI_APPLICATION = "sightline_api.asgi.application"
WSGI_APPLICATION = "sightline_api.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

database_url = os.environ.get("DATABASE_URL")

if database_url:
    parsed_database_url = urlparse(database_url)
    database_options = {}
    database_query = parse_qs(parsed_database_url.query)
    if "sslmode" in database_query:
        database_options["sslmode"] = database_query["sslmode"][0]

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed_database_url.path.lstrip("/"),
            "USER": unquote(parsed_database_url.username or ""),
            "PASSWORD": unquote(parsed_database_url.password or ""),
            "HOST": parsed_database_url.hostname or "",
            "PORT": str(parsed_database_url.port or ""),
            "OPTIONS": database_options,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = sorted(
    {
        origin.strip()
        for origin in os.environ.get(
            "SIGHTLINE_CORS_ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    }
)
CORS_ALLOW_CREDENTIALS = True
SESSION_COOKIE_NAME = "sightline_session"
CSRF_TRUSTED_ORIGINS = sorted(
    {
        origin.strip()
        for origin in os.environ.get(
            "SIGHTLINE_CSRF_TRUSTED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    }
)

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
