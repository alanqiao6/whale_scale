from django.contrib import admin
from .models import Measurement

@admin.register(Measurement)
class MeasurementAdmin(admin.ModelAdmin):
    list_display = ('id', 'measurement_name', 'user', 'measurement_type', 'measurement_timestamp')
    search_fields = ('measurement_name', 'user__username', 'measurement_type')
    list_filter = ('measurement_type', 'measurement_timestamp')