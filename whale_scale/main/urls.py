from django.urls import path
from .views import CollatriX, MorphoMetrix, Xcertainty
from .views import MeasurementView

urlpatterns = [
    path('morphometrix/<str:function_name>/', MorphoMetrix.as_view(), name='morphometrix_function'),
    path('collatrix/<str:function_name>/', CollatriX.as_view(), name='collatrix_function'),
    path('xcertainty/<str:function_name>/', Xcertainty.as_view(), name='xcertainty_function'),
    path('measurements/', MeasurementView.as_view(), name='measurements'),
]