"""
WhaleScale URL Configuration - Authentication Routes
===================================================

Purpose:
    Defines URL patterns for authentication endpoints in the WhaleScale
    application, including login, signup, logout, and session validation.

Author:
    Ciaran Burr

License:
    MIT
"""


from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('api/login/', views.login_api, name='login_api'),
    path('api/signup/', views.signup_api, name='signup_api'),
    path('api/logout/', views.logout_api, name='logout_api'),
    path('api/user/', views.check_auth, name='check_auth'),
    path('api/csrf/', views.get_csrf_token, name='csrf_token'),  # Add this new line
]