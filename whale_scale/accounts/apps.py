"""
WhaleScale Accounts App Configuration
===================================

Purpose:
    Django app configuration for the WhaleScale authentication system.
    Defines app name and database settings.

Author:
    Ciaran Burr

License:
    MIT
"""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'
