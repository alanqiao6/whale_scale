from django.shortcuts import render
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import json
import numpy as np
import types
from scipy.linalg import pascal
from scipy.sparse import diags
from itertools import cycle, islice

def index(request):
    return JsonResponse({"message": "Hello World!"})

# Define measurement type constants
consts = types.SimpleNamespace()
consts.LENGTH = 1
consts.AREA = 2
consts.ANGLE = 3
consts.WIDTH = 4

# Define object type constants
consts.LINEITEM = 1
consts.PATHITEM = 2
consts.ELLIPSEITEM = 3
consts.FONTITEM = 4
consts.POLYGONITEM = 5

# Define side bias constants
consts.SIDE_A = 0
consts.SIDE_B = 1


# -------------------------
# Measurement Class
# -------------------------
class Measurement:
    """Represents an individual measurement in the measurement stack."""

    def __init__(self, measurement_type, name):
        self.measurement_type = measurement_type
        self.measurement_name = name
        self.objects_params = []
        self.measurement_value = None

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
    

def bezier(t,P,k,arc = False):
    """
    Matrix representation of Bezier curve following
    https://pomax.github.io/bezierinfo/#arclength
    """
    signs = np.array([i for j,i in zip(range(k+1),islice(cycle([1, -1]),0,None))]) #create array alternating 0,1s for diagonals
    A = pascal(k+1, kind='lower') #generate Pascal triangle matrix
    S = diags(signs, [i-k for i in range(k+1)][::-1], shape=(k+1, k+1)).toarray() #create signs matrix
    M = A*S #multiply pascals by signs to get Bernoulli polynomial matrix
    coeff = A[-1,:]
    C = M*coeff[:,None] #broadcast
    T = np.array( [t**i for i in range(k+1)] ).T

    B = T.dot( C.dot(P) )

    if arc:
        return np.linalg.norm(B, axis = 1)
    else:
        return B


# -------------------------
# MorphoMetriX API
# -------------------------
class MorphoMetrix(View):
    """API endpoints for photogrammetry measurement tasks using MorphoMetriX."""

    @csrf_exempt
    def calculate_curve(self, request):
        """Compute Bézier curve interpolation and arc length."""
        data = json.loads(request.body)
        measurement_stack = [Measurement(**m) for m in data.get("measurement_stack", [])]

        measurement = measurement_stack[-1]
        control_points = np.array([[obj["parms"]["x"], obj["parms"]["y"]] for obj in measurement.objects_params])

        if len(control_points) < 2:
            return JsonResponse({"error": "At least two control points required"}, status=400)

        # Bézier curve computation
        nt = 100
        t = np.linspace(0.0, 1.0, nt)
        kb = len(control_points) - 1
        P = np.vstack(control_points)
        B = bezier(t, P, k=kb)
        Q = kb * np.diff(P, axis=0)

        measurement.measurement_value = np.sum(np.linalg.norm(Q, axis=1))
        measurement.Q = Q
        measurement.kb = kb
        measurement.P = P
        measurement.objects_params.clear()

        curve_points = [{"x": float(x), "y": float(y)} for x, y in B]
        return JsonResponse({"curve_points": curve_points, "length": measurement.measurement_value})

    @csrf_exempt
    def calculate_length(self, request):
        """Compute total length of selected measurement."""
        data = json.loads(request.body)
        measurement_data = data.get("measurement", {})
        measurement = Measurement(
            measurement_type=measurement_data.get("measurement_type"),
            name=measurement_data.get("measurement_name")
        )
        measurement.objects_params = measurement_data.get("objects_params", [])

        measurement.measurement_value = sum([obj["parms"].get("length", 0) for obj in measurement.objects_params])
        return JsonResponse({"length": measurement.measurement_value})

    @csrf_exempt
    def calculate_angle(self, request):
        """Compute the angle between two line segments."""
        data = json.loads(request.body)
        measurement = Measurement(**data.get("measurement"))

        lines = measurement.get_objects()
        if len(lines) < 2:
            return JsonResponse({"error": "At least two line segments required"}, status=400)

        measurement.measurement_value = lines[0]["parms"].angleTo(lines[1]["parms"])
        return JsonResponse({"angle": measurement.measurement_value})

    @csrf_exempt
    def calculate_area(self, request):
        """Compute area using the Shoelace formula."""
        data = json.loads(request.body)
        measurement = Measurement(**data.get("measurement"))

        qpolygon = [obj["parms"] for obj in measurement.objects_params if obj["type"] == consts.POLYGONITEM]

        if not qpolygon:
            return JsonResponse({"error": "No polygon found"}, status=400)

        qpolygon = qpolygon[0]

        S1 = sum((qpolygon[i]["x"] * qpolygon[i + 1]["y"]) - (qpolygon[i]["y"] * qpolygon[i + 1]["x"]) for i in range(len(qpolygon) - 1))
        conct = (qpolygon[-1]["x"] * qpolygon[0]["y"]) - (qpolygon[-1]["y"] * qpolygon[0]["x"])
        measurement.measurement_value = 0.5 * abs(S1 + conct)

        return JsonResponse({"area": measurement.measurement_value})

# -------------------------
# CollatriX Endpoints
# -------------------------
class CollatriX(View):
    """API endpoints for metadata extraction, EXIF processing, and collation."""

    @csrf_exempt
    def extract_exif(self, request):
        """
        Extract EXIF metadata from an image.
        Input:
            - image_path: str
        Output:
            - metadata: dict (Extracted EXIF data)
        """
        data = json.loads(request.body)
        image_path = data.get("image_path")

        metadata = {}  # Placeholder
        return JsonResponse({"metadata": metadata})

    @csrf_exempt
    def collate_measurements(self, request):
        """
        Collate measurements from multiple CSV files into a single dataset.
        Input:
            - csv_folder: str (Directory containing multiple CSV files)
        Output:
            - collated_file_path: str (Path to the combined CSV file)
        """
        data = json.loads(request.body)
        csv_folder = data.get("csv_folder")

        collated_file_path = ""  # Placeholder
        return JsonResponse({"collated_file_path": collated_file_path})

    @csrf_exempt
    def match_lidar_to_images(self, request):
        """
        Match LiDAR data to images based on timestamps.
        Input:
            - image_folder: str
            - lidar_file: str
        Output:
            - matched_data: dict (LiDAR data matched with images)
        """
        data = json.loads(request.body)
        image_folder = data.get("image_folder")
        lidar_file = data.get("lidar_file")

        matched_data = {}  # Placeholder
        return JsonResponse({"matched_data": matched_data})


# -------------------------
# Xcertainty Endpoints
# -------------------------
class Xcertainty(View):
    """API endpoints for uncertainty estimation and Bayesian modeling."""

    @csrf_exempt
    def estimate_length_uncertainty(self, request):
        """
        Estimate uncertainty in length measurement using Bayesian inference.
        Input:
            - measurements: list of floats
            - priors: dict (Prior distributions)
        Output:
            - uncertainty: dict (Posterior estimates)
        """
        data = json.loads(request.body)
        measurements = data.get("measurements")
        priors = data.get("priors")

        uncertainty = {}  # Placeholder
        return JsonResponse({"uncertainty": uncertainty})

    @csrf_exempt
    def fit_growth_curve(self, request):
        """
        Fit a growth curve model to whale measurement data.
        Input:
            - measurements: dict (Subject-wise measurement data)
            - priors: dict (Prior distributions)
        Output:
            - model_results: dict (Posterior growth curve estimates)
        """
        data = json.loads(request.body)
        measurements = data.get("measurements")
        priors = data.get("priors")

        model_results = {}  # Placeholder
        return JsonResponse({"model_results": model_results})

    @csrf_exempt
    def calibrate_measurements(self, request):
        """
        Perform calibration on measurement data to estimate systematic biases.
        Input:
            - calibration_data: dict (Known-length objects with measurements)
        Output:
            - calibration_results: dict (Bias-corrected estimates)
        """
        data = json.loads(request.body)
        calibration_data = data.get("calibration_data")

        calibration_results = {}  # Placeholder
        return JsonResponse({"calibration_results": calibration_results})