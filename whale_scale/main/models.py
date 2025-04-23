from django.db import models
from django.contrib.auth.models import User

class Measurement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="measurements")
    subject_name = models.CharField(max_length=255, blank=True, null=True)
    measurement_type = models.CharField(max_length=50)
    user_image_path = models.TextField()
    image_timestamp = models.DateTimeField()
    measurement_timestamp = models.DateTimeField()
    coordinate_data = models.JSONField()
    pixel_dimension = models.FloatField(blank=True, null=True)
    pixel_count = models.IntegerField(blank=True, null=True)
    scaled_dimension = models.FloatField(blank=True, null=True)
    focal_length = models.FloatField(blank=True, null=True)
    sensor_width = models.FloatField(blank=True, null=True)
    image_width = models.IntegerField(blank=True, null=True)
    image_height = models.IntegerField(blank=True, null=True)
    field_of_view = models.FloatField(blank=True, null=True)
    altitude = models.FloatField(blank=True, null=True)
    altitude_offset = models.FloatField(blank=True, null=True)
    gps_latitude = models.FloatField(blank=True, null=True)
    gps_longitude = models.FloatField(blank=True, null=True)
    camera_make = models.CharField(max_length=255, blank=True, null=True)
    camera_model = models.CharField(max_length=255, blank=True, null=True)
    actual_measurement = models.FloatField(blank=True, null=True)
    subject_age = models.FloatField(blank=True, null=True)
    subject_group = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.subject_name or self.measurement_type}"

class BodyCondition(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    measurement_ids = models.JSONField()
    body_area_index = models.FloatField()
    body_volume = models.FloatField()
    surface_area = models.FloatField()
    image = models.CharField(max_length=255)
    image_id = models.CharField(max_length=255)
    increment = models.FloatField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"BodyCondition for {self.user.username} on {self.image_id}"
