from django.db import models
from django.contrib.auth.hashers import make_password, check_password

class UserCredential(models.Model):
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=255)  # Store hashed passwords for security
    data = models.CharField(max_length=100, blank=True, null=True)  # Store alphanumeric data or letters
    
    def save(self, *args, **kwargs):
        # Ensure password is hashed before saving
        if not self.password.startswith('pbkdf2_sha256') and self.password:
            self.password = make_password(self.password)
        super().save(*args, **kwargs)
    
    def set_password(self, raw_password):
        """Hash and set the password"""
        self.password = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Check if the provided password is correct"""
        return check_password(raw_password, self.password)
    
    def __str__(self):
        return self.username