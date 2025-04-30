'''
The following is a Python file adapted from the MMI-CODEX/MorphometriX repository
https://github.com/MMI-CODEX/MorphometriX

Author: Jason Fitzpatrick
'''

class Measurement:
    """Represents an individual measurement in the measurement stack."""

    def __init__(self, measurement_type, name, objects_params=None, measurement_value=None):
        self.measurement_type = measurement_type
        self.measurement_name = name
        self.objects_params = objects_params if objects_params is not None else []
        self.measurement_value = measurement_value

        # Used by width measurement
        self.Q = None
        self.kb = None
        self.l = None
        self.P = None

    def get_type(self):
        return self.measurement_type

    def get_objects(self):
        return self.objects_params

    def get_name(self):
        return self.measurement_name

    def append_object(self, obj):
        self.objects_params.append(obj)

    def rem_object(self):
        if self.objects_params:
            self.objects_params.pop()

    def has_objects(self):
        return len(self.objects_params) > 0