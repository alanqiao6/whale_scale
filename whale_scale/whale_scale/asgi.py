"""
WhaleScale Django ASGI Configuration
=======================================

Purpose:
   Exposes the ASGI callable as a module-level variable named 'application'
   for use with ASGI-compatible web servers and channels during deployment.
   
Author:
   Jason Fitzpatrick, Ciaran Burr
   
For more information:
   https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "whale_scale.settings")

application = get_asgi_application()
