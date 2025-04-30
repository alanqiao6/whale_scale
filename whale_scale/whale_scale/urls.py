"""
WhaleScale Main URL Configuration
================================

Purpose:
    Defines the URL patterns for the entire WhaleScale application,
    connecting URL paths to their respective views and including
    URL configurations from individual apps.

Authors:
    Jason, Ciaran

License:
    MIT
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('api/', include('main.urls')),
    path('accounts/', include('accounts.urls')),  # Add this line
    # path("admin/", admin.site.urls), # UNCOMMENT THIS TO ACCESS THE ADMIN PANEL
]
