"""
WhaleScale Django WSGI Configuration
=======================================

Purpose:
    Exposes the WSGI callable as a module-level variable named 'application'
    for use with WSGI-compatible web servers during production deployment.
    
Author:
    Jason Fitzpatrick, Ciaran Burr
    
For more information:
    https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "whale_scale.settings")

application = get_wsgi_application()
