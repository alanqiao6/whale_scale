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
from django.core.files.storage import default_storage
import os
import pandas as pd

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
@method_decorator(csrf_exempt, name='dispatch')
class MorphoMetrix(View):
    """API endpoints for photogrammetry measurement tasks using MorphoMetriX."""

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

    def calculate_angle(self, request):
        """Compute the angle between two line segments."""
        data = json.loads(request.body)
        measurement = Measurement(**data.get("measurement"))

        lines = measurement.get_objects()
        if len(lines) < 2:
            return JsonResponse({"error": "At least two line segments required"}, status=400)

        measurement.measurement_value = lines[0]["parms"].angleTo(lines[1]["parms"])
        return JsonResponse({"angle": measurement.measurement_value})

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
@method_decorator(csrf_exempt, name='dispatch')
class CollatriX(View):
    """API endpoints for metadata extraction, EXIF processing, and collation."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.exiftool = ExifToolHelper()

    def post(self, request, function_name):
        """
        Routes requests to the appropriate function based on the URL path.
        """
        if function_name == "extract-metadata":
            return self.extract_metadata(request)
        elif function_name == "merge-altimeter":
            return self.merge_altimeter_data(request)
        elif function_name == "calculate-body-condition":
            return self.calculate_body_condition(request)
        elif function_name == "collate-morphometrix":
            return self.collate_morphometrix_csv(request)
        else:
            return JsonResponse({"error": "Invalid function name"}, status=400)

    def extract_metadata(self, request):
        """
        Extracts metadata from an uploaded image.
        """
        if 'image' not in request.FILES:
            return JsonResponse({"error": "No image file provided"}, status=400)

        uploaded_image = request.FILES['image']
        image_path = default_storage.save(uploaded_image.name, uploaded_image)

        try:
            with self.exiftool as et:
                metadata = et.get_metadata(image_path)

            response_data = {
                "timestamp": metadata.get("EXIF:DateTimeOriginal", "Unknown"),
                "altitude": metadata.get("EXIF:GPSAltitude", None),
                "camera_model": metadata.get("EXIF:Model", "Unknown"),
                "file_name": metadata.get("File:FileName", os.path.basename(image_path)),
            }

            return JsonResponse(response_data)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

        finally:
            os.remove(image_path)

    def merge_altimeter_data(self, request):
        """
        Merges uploaded altimeter CSV data with image metadata.
        """
        if 'metadata' not in request.FILES or 'altimeter' not in request.FILES:
            return JsonResponse({"error": "Both metadata and altimeter CSVs are required"}, status=400)

        metadata_csv = request.FILES['metadata']
        altimeter_csv = request.FILES['altimeter']

        metadata_path = default_storage.save(metadata_csv.name, metadata_csv)
        altimeter_path = default_storage.save(altimeter_csv.name, altimeter_csv)

        try:
            df_images = pd.read_csv(metadata_path)
            df_altimeter = pd.read_csv(altimeter_path)

            # Convert timestamps to datetime format
            df_images["timestamp"] = pd.to_datetime(df_images["timestamp"], errors="coerce")
            df_altimeter["timestamp"] = pd.to_datetime(df_altimeter["timestamp"], errors="coerce")

            # Merge using the closest timestamp
            merged_df = pd.merge_asof(df_images.sort_values("timestamp"),
                                      df_altimeter.sort_values("timestamp"),
                                      on="timestamp", direction="nearest")

            return JsonResponse(merged_df.to_dict(orient="records"), safe=False)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

        finally:
            os.remove(metadata_path)
            os.remove(altimeter_path)

    def calculate_body_condition(self, request):
        """
        Calculates cetacean body condition metrics based on uploaded measurement CSV.
        """
        if 'measurements' not in request.FILES:
            return JsonResponse({"error": "Measurement CSV file required"}, status=400)

        measurements_csv = request.FILES['measurements']
        measurements_path = default_storage.save(measurements_csv.name, measurements_csv)

        try:
            measurements_df = pd.read_csv(measurements_path)

            # Example metric: Body Mass Index-like formula
            if "length" in measurements_df and "girth" in measurements_df:
                measurements_df["body_condition_index"] = (
                    measurements_df["length"] / (measurements_df["girth"] ** 2)
                )
            else:
                return JsonResponse({"error": "CSV must contain 'length' and 'girth' columns"}, status=400)

            return JsonResponse(measurements_df.to_dict(orient="records"), safe=False)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

        finally:
            os.remove(measurements_path)

    def collate_morphometrix_csv(self, request):
        """
        Combines multiple MorphoMetriX CSV outputs into one dataset.
        """
        if 'csv_files' not in request.FILES:
            return JsonResponse({"error": "CSV files required"}, status=400)

        csv_files = request.FILES.getlist('csv_files')
        file_paths = [default_storage.save(f.name, f) for f in csv_files]

        try:
            data_frames = [pd.read_csv(file) for file in file_paths]
            combined_df = pd.concat(data_frames, ignore_index=True)

            return JsonResponse(combined_df.to_dict(orient="records"), safe=False)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

        finally:
            for file_path in file_paths:
                os.remove(file_path)


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