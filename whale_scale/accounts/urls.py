# whale_scale/accounts/urls.py

from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('api/login/', views.login_api, name='login_api'),
    path('api/signup/', views.signup_api, name='signup_api'),
    path('api/logout/', views.logout_api, name='logout_api'),
    path('api/user/', views.check_auth, name='check_auth'),
]