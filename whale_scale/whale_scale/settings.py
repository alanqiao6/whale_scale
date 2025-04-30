"""
WhaleScale Django Settings Configuration
=======================================

Purpose:
    Configures the Django settings for the WhaleScale application
    with environment-specific configurations for development and production.
    Handles database connections, authentication, security, CORS, 
    and session management.

Author:
    Jason, Ciaran

License:
    MIT
"""

from pathlib import Path

import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

ENV = os.environ.get('ENVIRONMENT', 'dev')  # 'prod' or 'dev'

DEBUG = os.environ.get(f'{ENV.upper()}_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.environ.get(f'{ENV.upper()}_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure1234')

STATIC_ROOT = os.path.join(BASE_DIR, 'static')
# MEDIA_ROOT = os.path.join(BASE_DIR, 'media')  # Fixed: Changed from duplicate STATIC_ROOT

# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "main",
    "accounts",  # Add this for authentication
    "corsheaders",  # Add this if you want to use CORS
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # This must be first
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "whale_scale.urls"

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

WSGI_APPLICATION = "whale_scale.wsgi.application"


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases
import sys

# Use SQLite for tests
if 'test' in sys.argv or 'run_tests.py' in sys.argv:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'test_db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('POSTGRES_DB'),
            'USER': os.environ.get('POSTGRES_USER'),
            'PASSWORD': os.environ.get('POSTGRES_PASSWORD'),
            'HOST': os.environ.get('POSTGRES_HOST', 'db'),
            'PORT': os.environ.get('POSTGRES_PORT', '5432'),
        }
    }


# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = "static/"

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://dev-whale-scale.colab.duke.edu",  # Add your production domain
    "https://whale-scale.colab.duke.edu",
]
CORS_ALLOW_CREDENTIALS = True  # Important for cookies/session auth

# Add this section to fix the CSRF issue
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    "https://dev-whale-scale.colab.duke.edu",  # Add your production domain
    "https://whale-scale.colab.duke.edu",
]

# Add environment-specific cookie settings to prevent conflicts
if ENV == 'dev':
    SESSION_COOKIE_NAME = 'dev_sessionid'
    CSRF_COOKIE_NAME = 'dev_csrftoken'
    if not DEBUG:  # Only set domain in production-like environment
        CSRF_COOKIE_DOMAIN = 'dev-whale-scale.colab.duke.edu'
        SESSION_COOKIE_DOMAIN = 'dev-whale-scale.colab.duke.edu'
else:
    SESSION_COOKIE_NAME = 'prod_sessionid'
    CSRF_COOKIE_NAME = 'prod_csrftoken'
    if not DEBUG:  # Only set domain in production environment
        CSRF_COOKIE_DOMAIN = 'whale-scale.colab.duke.edu'
        SESSION_COOKIE_DOMAIN = 'whale-scale.colab.duke.edu'

# Session settings
SESSION_COOKIE_AGE = 3600  # 1 hour (you can keep this as is)
SESSION_EXPIRE_AT_BROWSER_CLOSE = True  # Add this to ensure session expires when browser closes
SESSION_COOKIE_SECURE = True  # Set to True in production with HTTPS
SESSION_COOKIE_HTTPONLY = True  # Add this to prevent JavaScript access to session cookie
SESSION_COOKIE_SAMESITE = 'Lax'  # Add this for security
SESSION_ENGINE = 'django.contrib.sessions.backends.db'  # Use database-backed sessions
SESSION_COOKIE_PATH = '/'  # Add this to ensure the cookie applies to all paths

# Authentication settings
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/accounts/login/'
LOGIN_URL = '/accounts/login/'

DATA_UPLOAD_MAX_MEMORY_SIZE = 100 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 100 * 1024 * 1024