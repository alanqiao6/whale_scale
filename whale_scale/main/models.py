from django.db import models

class UserCredential(models.Model):
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=255)  # Store hashed passwords for security

    def __str__(self):
        return self.username