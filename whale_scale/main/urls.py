from django.contrib import admin
from django.urls import path
from .views import index, CollatriX, MorphoMetrix, Xcertainty, UserCredentialList, LoginView, CreateAccountView

urlpatterns = [
    path('admin/', admin.site.urls),  # Add this line for the admin page
    path('home/', index),
    path('morphometrix/<str:function_name>/', MorphoMetrix.as_view(), name='morphometrix_function'),
    path('collatrix/<str:function_name>/', CollatriX.as_view(), name='collatrix_function'),
    path('xcertainty/<str:function_name>/', Xcertainty.as_view(), name='xcertainty_function'),
    path('api/user_credentials/', UserCredentialList.as_view(), name='user-credentials-list'),
    path('api/login', LoginView.as_view(), name='login'),
    path('api/create-account', CreateAccountView.as_view(), name='create-account'),  # Add this line for account creation
]