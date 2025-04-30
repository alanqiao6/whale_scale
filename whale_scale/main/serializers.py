'''
Serializes models
Author: Jason Fitzpatrick
'''

from rest_framework import serializers
from .models import Measurement, BodyCondition

class MeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Measurement
        fields = '__all__'


class BodyConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BodyCondition
        fields = '__all__'