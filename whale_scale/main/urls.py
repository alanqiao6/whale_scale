from django.contrib import admin
from django.urls import path
from .views import (
    index, 
    CollatriX, 
    MorphoMetrix, 
    Xcertainty, 
    UserCredentialList, 
    LoginView,
    logout_view,
    login_view,
    create_account
)

urlpatterns = [
    path('admin/', admin.site.urls),  # Add this line for the admin page
    path('home/', index),
    path('morphometrix/<str:function_name>/', MorphoMetrix.as_view(), name='morphometrix_function'),
    path('collatrix/<str:function_name>/', CollatriX.as_view(), name='collatrix_function'),
    path('xcertainty/<str:function_name>/', Xcertainty.as_view(), name='xcertainty_function'),
    path('api/user_credentials/', UserCredentialList.as_view(), name='user-credentials-list'),
    path('api/login', login_view, name='login'),
    path('api/create-account', create_account, name='create-account'),
    path('api/logout', logout_view, name='logout'),
]