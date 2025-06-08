'''
Default Models
Author: Alan Qiao, August Hao, Ciaran Burr, Jason Fitzpatrick
'''

from django.db import models
from django.contrib.auth.models import User
import json

class UploadedImage(models.Model):
    """Stores metadata and information about uploaded images"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)  # Allow anonymous users
    filename = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255, null=True, blank=True)
    upload_date = models.DateTimeField(auto_now_add=True)
    
    # Extracted metadata fields
    focal_length_mm = models.FloatField(null=True, blank=True)
    gps_altitude_m = models.FloatField(null=True, blank=True)
    altitude_offset = models.FloatField(null=True, blank=True)
    image_width = models.IntegerField(null=True, blank=True)
    image_height = models.IntegerField(null=True, blank=True)
    field_of_view_deg = models.FloatField(null=True, blank=True)
    sensor_width = models.FloatField(null=True, blank=True)
    pixel_dimension = models.FloatField(null=True, blank=True)
    
    # Additional EXIF metadata
    camera_make = models.CharField(max_length=100, null=True, blank=True)
    camera_model = models.CharField(max_length=100, null=True, blank=True)
    timestamp = models.CharField(max_length=100, null=True, blank=True)
    gps_latitude = models.FloatField(null=True, blank=True)
    gps_longitude = models.FloatField(null=True, blank=True)
    
    # Session tracking for anonymous users
    session_key = models.CharField(max_length=40, null=True, blank=True)
    
    class Meta:
        ordering = ['-upload_date']
    
    def __str__(self):
        return f"{self.filename} - {self.upload_date}"

class Measurement(models.Model):
    """Stores measurement data for each image"""
    MEASUREMENT_TYPES = [
        ('ruler', 'Ruler/Line'),
        ('curve', 'Manual Curve'),
        ('area', 'Area'),
        ('angle', 'Angle'),
        ('TL', 'Total Length'),
        ('width_segment', 'Width Segment'),
    ]
    
    image = models.ForeignKey(UploadedImage, on_delete=models.CASCADE, related_name='measurements')
    measurement_type = models.CharField(max_length=50, choices=MEASUREMENT_TYPES)
    measurement_name = models.CharField(max_length=100, null=True, blank=True)
    
    # Store the actual measurement value
    scaled_dimension = models.FloatField(null=True, blank=True)  # Result in real-world units
    pixel_value = models.FloatField(null=True, blank=True)  # Result in pixels
    
    # Store coordinate data as JSON
    coordinate_data = models.JSONField(null=True, blank=True)
    
    # Additional metadata
    created_date = models.DateTimeField(auto_now_add=True)
    measurement_metadata = models.JSONField(null=True, blank=True)  # Store any additional info
    
    class Meta:
        ordering = ['-created_date']
    
    def __str__(self):
        return f"{self.measurement_type} on {self.image.filename}"
    
    def set_coordinate_data(self, data):
        """Helper method to store coordinate data"""
        self.coordinate_data = data
    
    def get_coordinate_data(self):
        """Helper method to retrieve coordinate data"""
        return self.coordinate_data or []

class BodyConditionResult(models.Model):
    """Stores body condition calculation results"""
    image = models.ForeignKey(UploadedImage, on_delete=models.CASCADE, related_name='body_condition_results')
    
    # Body condition metrics
    body_volume = models.FloatField(null=True, blank=True)
    body_area_index = models.FloatField(null=True, blank=True)
    surface_area = models.FloatField(null=True, blank=True)
    
    # Calculation parameters
    bv_method = models.CharField(max_length=50, null=True, blank=True)  # e.g., "Circle"
    bai_method = models.CharField(max_length=50, null=True, blank=True)  # e.g., "Parabola"
    interval = models.FloatField(null=True, blank=True)
    lower_bound = models.FloatField(null=True, blank=True)
    upper_bound = models.FloatField(null=True, blank=True)
    
    # Store full results as JSON
    full_results = models.JSONField(null=True, blank=True)
    
    created_date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Body condition for {self.image.filename}"

class UserSession(models.Model):
    """Track anonymous user sessions for data persistence"""
    session_key = models.CharField(max_length=40, unique=True)
    created_date = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Session {self.session_key}"