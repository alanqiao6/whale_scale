"""
WhaleScale Accounts App Configuration
===================================

Purpose:
    Django app configuration for the WhaleScale authentication system

Author:
    Ciaran Burr

License:
    MIT
"""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'
