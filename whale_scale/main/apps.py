'''
Default apps config

Author: Alan Qiao, August Hao, Ciaran Burr, Jason Fitzpatrick
'''

from django.apps import AppConfig


class MainConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "main"
