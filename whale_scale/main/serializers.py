from rest_framework import serializers
from .models import UserCredential

class UserCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCredential
        fields = ['id', 'username', 'password', 'data']  # You can omit the password field for security reasons
