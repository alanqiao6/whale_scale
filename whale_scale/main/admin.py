'''
Registers models for admin panel
Author: Jason Fitzpatrick
'''

from django.contrib import admin
from .models import Measurement, BodyCondition

@admin.register(Measurement)
class MeasurementAdmin(admin.ModelAdmin):
    list_display = ('id', 'subject_name', 'user', 'measurement_type', 'measurement_timestamp')
    search_fields = ('subject_name', 'user__username', 'measurement_type')
    list_filter = ('measurement_type', 'measurement_timestamp')

@admin.register(BodyCondition)
class BodyConditionAdmin(admin.ModelAdmin):
    list_display = ('user', 'body_area_index', 'body_volume', 'surface_area', 'increment')

