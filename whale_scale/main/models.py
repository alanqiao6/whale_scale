'''
Default Models
Author: Alan Qiao, August Hao, Ciaran Burr, Jason Fitzpatrick
FIXED: Added whale_name field to UploadedImage model for proper whale tracking
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
    
    # NEW: Whale identification fields
    whale_name = models.CharField(max_length=100, null=True, blank=True)  # User-entered whale name
    whale_id = models.CharField(max_length=100, null=True, blank=True)    # Generated whale ID (e.g., "Moby1")
    
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
        whale_display = f" ({self.whale_id})" if self.whale_id else ""
        return f"{self.filename}{whale_display} - {self.upload_date}"
    
    def get_whale_count(self):
        """Get the count of images for this whale name"""
        if not self.whale_name:
            return 0
        
        # Count images with the same whale name for this user/session
        if self.user:
            return UploadedImage.objects.filter(
                user=self.user,
                whale_name__iexact=self.whale_name
            ).count()
        else:
            return UploadedImage.objects.filter(
                session_key=self.session_key,
                whale_name__iexact=self.whale_name
            ).count()
    
    def generate_whale_id(self):
        """Generate the whale ID based on whale name and count"""
        if not self.whale_name:
            # Use filename without extension as fallback
            base_name = self.original_filename or self.filename
            if base_name:
                base_name = base_name.rsplit('.', 1)[0]  # Remove extension
                return base_name
            return "unnamed_whale"
        
        # Count existing images with same whale name
        if self.user:
            existing_count = UploadedImage.objects.filter(
                user=self.user,
                whale_name__iexact=self.whale_name
            ).exclude(id=self.id).count()
        else:
            existing_count = UploadedImage.objects.filter(
                session_key=self.session_key,
                whale_name__iexact=self.whale_name
            ).exclude(id=self.id).count()
        
        # Generate ID with incremented number
        whale_number = existing_count + 1
        return f"{self.whale_name}{whale_number}"
    
    def save(self, *args, **kwargs):
        # Auto-generate whale_id if not set
        if not self.whale_id:
            # Need to save first to get an ID for the exclude() in generate_whale_id
            super().save(*args, **kwargs)
            self.whale_id = self.generate_whale_id()
            super().save(update_fields=['whale_id'])
        else:
            super().save(*args, **kwargs)

class Measurement(models.Model):
    """Stores measurement data for each image"""
    MEASUREMENT_TYPES = [
        ('ruler', 'Ruler/Line'),
        ('ruler_complete', 'Complete Ruler with Width Segments'),
        ('curve', 'Manual Curve'),
        ('curve_length', 'Curve Length'),
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
        whale_info = ""
        if self.image.whale_id:
            whale_info = f" for {self.image.whale_id}"
        return f"{self.measurement_type}{whale_info} on {self.image.filename}"
    
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
        whale_info = f" for {self.image.whale_id}" if self.image.whale_id else ""
        return f"Body condition{whale_info} - {self.image.filename}"

class UserSession(models.Model):
    """Track anonymous user sessions for data persistence"""
    session_key = models.CharField(max_length=40, unique=True)
    created_date = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Session {self.session_key}"