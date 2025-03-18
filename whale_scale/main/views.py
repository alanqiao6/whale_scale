from django.shortcuts import render
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import json
import numpy as np
import types
from django.core.files.storage import default_storage
import os
import pandas as pd

from MMI_CODEX.collatrix.body_condition.calculate_body_area_index import calculate_body_area_index
from MMI_CODEX.collatrix.body_condition.calculate_body_volume import calculate_body_volume
from MMI_CODEX.collatrix.lidar_wrangle.wrangle_lemhex_lidar import wrangle_lemhex_lidar
from MMI_CODEX.collatrix.lidar_wrangle.wrangle_lightware_lidar import wrangle_lightware_lidar
from MMI_CODEX.collatrix.pyexifhelper_exiftool.helper import ExifToolHelper

from MMI_CODEX.morphometrix.calculate_widths import calculate_widths
from MMI_CODEX.morphometrix.compute_angle_between_lines import compute_angle_between_lines
from MMI_CODEX.morphometrix.compute_curve_length import compute_curve_length
from MMI_CODEX.morphometrix.compute_polygon_area import compute_polygon_area
from MMI_CODEX.morphometrix.constants import ObjectTypes
from MMI_CODEX.morphometrix.measurement import Measurement

from MMI_CODEX.xcertainty.parsers.combine_observations import combine_observations
from MMI_CODEX.xcertainty.parsers.parse_observations import parse_observations
from MMI_CODEX.xcertainty.samplers.calibration_sampler import calibration_sampler
from MMI_CODEX.xcertainty.samplers.growth_curve_sampler import growth_curve_sampler
from MMI_CODEX.xcertainty.samplers.independent_length_sampler import independent_length_sampler
from MMI_CODEX.xcertainty.samplers.nondecreasing_length_sampler import nondecreasing_length_sampler
from MMI_CODEX.xcertainty.util.body_condition import body_condition
from MMI_CODEX.xcertainty.util.extract_summaries import extract_summaries

from pathlib import Path

current_dir = Path(__file__).resolve().parent
exiftool_path = current_dir / '..' / 'MMI_CODEX' / 'collatrix' / 'exiftool.exe'
exiftool_path = exiftool_path.resolve()

def index(request):
    return JsonResponse({"message": "Hello World!"})

# -------------------------
# MorphoMetriX API
# -------------------------
@method_decorator(csrf_exempt, name='dispatch')
class MorphoMetrix(View):
    """API endpoints for photogrammetry measurement tasks using MorphoMetriX."""

    def post(self, request, function_name):
        """Route requests to the appropriate function."""
        if function_name == "calculate_curve":
            return self.calculate_curve(request)
        elif function_name == "calculate_length":
            return self.calculate_length(request)
        elif function_name == "calculate_angle":
            return self.calculate_angle(request)
        elif function_name == "calculate_area":
            return self.calculate_area(request)
        else:
            return JsonResponse({"error": "Invalid function name"}, status=400)

    def calculate_curve(self, request):
        """Compute Bézier curve interpolation and arc length."""
        data = json.loads(request.body)
        measurement_stack = [Measurement(**m) for m in data.get("measurement_stack", [])]

        measurement = measurement_stack[-1]
        control_points = np.array([[obj["parms"]["x"], obj["parms"]["y"]] for obj in measurement.objects_params])

        if len(control_points) < 2:
            return JsonResponse({"error": "At least two control points required"}, status=400)

        B, length, Q, kb, P = compute_curve_length(control_points)

        measurement.measurement_value = length
        measurement.Q = Q
        measurement.kb = kb
        measurement.P = P
        measurement.objects_params.clear()

        curve_points = [{"x": float(x), "y": float(y)} for x, y in B]
        return JsonResponse({"curve_points": curve_points, "length": length})

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

        try:
            data = json.loads(request.body)
            measurement = Measurement(**data.get("measurement"))
            lines = measurement.get_objects()

            if len(lines) < 2:
                return JsonResponse({"error": "At least two line segments are required."}, status=400)

            line1 = lines[0]["parms"]
            line2 = lines[1]["parms"]

            measurement.measurement_value = compute_angle_between_lines(line1, line2)

            return JsonResponse({"angle": measurement.measurement_value})

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            return JsonResponse({"error": f"Invalid input data: {str(e)}"}, status=400)


    def calculate_area(self, request):
        """Compute area using the Shoelace formula."""
        data = json.loads(request.body)
        measurement = Measurement(**data.get("measurement"))

        qpolygon = [obj["parms"] for obj in measurement.objects_params if obj["type"] == ObjectTypes.POLYGONITEM]

        if not qpolygon:
            return JsonResponse({"error": "No polygon found"}, status=400)

        area = compute_polygon_area(qpolygon[0])
        measurement.measurement_value = area

        return JsonResponse({"area": measurement.measurement_value})
    
    def calculate_widths(self, data):
        """Compute width measurements."""
        measurement_stack = [Measurement(**m) for m in data.get("measurement_stack", [])]
        bias = data.get("bias", None)

        widths = calculate_widths(measurement_stack, bias)
        if not widths:
            return {"success": False, "message": "No valid width measurements found"}

        return {"success": True, "widths": widths}
    

# -------------------------
# CollatriX Endpoints
# -------------------------
@method_decorator(csrf_exempt, name='dispatch')
class CollatriX(View):
    """API endpoints for metadata extraction, EXIF processing, and collation."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.exiftool = ExifToolHelper(executable=str(exiftool_path))

    def post(self, request, function_name):
        """
        Routes requests to the appropriate function based on the URL path.
        """
        if function_name == "extract-metadata":
            return self.extract_metadata(request)
        elif function_name == "calculate-body-condition":
            return self.calculate_body_condition(request)
        elif function_name == "lidar-wrangle":
            return self.lidar_wrangle(request)
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
                metadata = et.get_metadata(image_path)[0]

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

    def calculate_body_condition(self, request):
        """
        Calculates cetacean body condition metrics based on uploaded measurements.
        """
        data = json.loads(request.body)
        df = pd.DataFrame(data["measurements"])

        bv_method = data.get("bv_method")
        bai_method = data.get("bai_method")
        tl_name = data.get("tl_name")
        interval = float(data.get("interval", 5))
        lower = float(data.get("lower", 0))
        upper = float(data.get("upper", 100))

        # Handle "Both" options and merge results
        df_vol = calculate_body_volume(df, tl_name, interval, lower, upper, bv_method)
        df_bai = calculate_body_area_index(df, tl_name, interval, lower, upper, bai_method)

        if df_vol is not None and df_bai is not None:
            result = pd.merge(df_vol, df_bai, on=["Image_ID", "Image"], how="outer")
        elif df_vol is not None:
            result = df_vol
        elif df_bai is not None:
            result = df_bai
        else:
            return JsonResponse({"error": "No valid calculation method provided"}, status=400)

        return JsonResponse(result.to_dict(orient="records"), safe=False)
    
    def lidar_wrangle(self, request):
        """
        Wrangles LiDAR data from either LightWare CSV or LemHex GPX files.
        """
        lidar_type = request.POST.get('lidar_type')
        gimbal_type = request.POST.get('gimbal_type')  # for LightWare only

        if 'files' not in request.FILES:
            return JsonResponse({"error": "LiDAR files required"}, status=400)

        files = request.FILES.getlist('files')
        file_paths = [default_storage.save(file.name, file) for file in files]

        try:
            if lidar_type == "LightWare":
                if not gimbal_type:
                    return JsonResponse({"error": "Gimbal type is required for LightWare"}, status=400)

                # Call the helper function for LightWare
                laser_all = wrangle_lightware_lidar(file_paths, gimbal_type)

            elif lidar_type == "LemHex":
                # Call the helper function for LemHex
                laser_all = wrangle_lemhex_lidar(file_paths)

            else:
                return JsonResponse({"error": "Invalid LiDAR type"}, status=400)

            # Return as JSON (instead of CSV)
            return JsonResponse(laser_all.to_dict(orient='records'), safe=False)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

        finally:
            for file_path in file_paths:
                os.remove(file_path)

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
@method_decorator(csrf_exempt, name='dispatch')
class Xcertainty(View):
    """API endpoints for Bayesian photogrammetric analysis using Xcertainty."""

    def post(self, request, function_name):
        """Route requests to the appropriate function."""
        if function_name == "parse_observations":
            return self.parse_observations(request)
        elif function_name == "combine_observations":
            return self.combine_observations(request)
        elif function_name == "run_sampler":
            return self.run_sampler(request)
        elif function_name == "extract_summaries":
            return self.extract_summaries(request)
        elif function_name == "calculate_body_condition":
            return self.calculate_body_condition(request)
        else:
            return JsonResponse({"error": "Invalid function name"}, status=400)
    
    def parse_observations(self, request):
        """Parse wide-format photogrammetric data into structured observations."""
        data = json.loads(request.body)
        df = pd.DataFrame(data.get("observations", []))
        
        try:
            parsed_data = parse_observations(
                df, subject_col=data["subject_col"], meas_col=data["meas_col"], 
                tlen_col=data.get("tlen_col"), image_col=data["image_col"],
                barometer_col=data.get("barometer_col"), laser_col=data.get("laser_col"),
                flen_col=data["flen_col"], iwidth_col=data["iwidth_col"], 
                swidth_col=data["swidth_col"], uas_col=data["uas_col"], 
                timepoint_col=data.get("timepoint_col"), alt_conversion_col=data.get("alt_conversion_col")
            )
            return JsonResponse(parsed_data, safe=False)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    def combine_observations(self, request):
        """Combine multiple parsed observation datasets."""
        data = json.loads(request.body)
        try:
            combined_data = combine_observations(*data["datasets"])
            return JsonResponse(combined_data, safe=False)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    def run_sampler(self, request, sampler_type):
        """Run the specified MCMC sampler on parsed data."""
        data = json.loads(request.body)
        try:
            parsed_data = data["parsed_data"]
            priors = data["priors"]
            sampler = None
            
            if sampler_type == "independent_length":
                sampler = independent_length_sampler(parsed_data, priors)
            elif sampler_type == "nondecreasing_length":
                sampler = nondecreasing_length_sampler(parsed_data, priors)
            elif sampler_type == "growth_curve":
                sampler = growth_curve_sampler(parsed_data, priors, data["subject_info"])
            elif sampler_type == "calibration":
                sampler = calibration_sampler(parsed_data, priors)
            else:
                return JsonResponse({"error": "Invalid sampler type"}, status=400)
            
            result = sampler(niter=data["niter"], thin=data.get("thin", 1), summary_burn=data.get("summary_burn", 0.5))
            return JsonResponse(result, safe=False)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    def extract_summaries(self, request):
        """Extract summaries from Xcertainty MCMC results."""
        data = json.loads(request.body)
        try:
            summaries = extract_summaries(data["model_output"])
            return JsonResponse(summaries.to_dict(orient="records"), safe=False)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    def calculate_body_condition(self, request):
        """Calculate body condition metrics using photogrammetric data."""
        data = json.loads(request.body)
        try:
            measurements = pd.DataFrame(data.get("measurements", []))
            length_name = data["length_name"]
            width_names = data["width_names"]
            width_increments = data["width_increments"]
            
            result = body_condition(
                data=measurements,
                output=data["output"],
                length_name=length_name,
                width_names=width_names,
                width_increments=width_increments,
                summary_burn=data.get("summary_burn", 0.5)
            )
            return JsonResponse(result, safe=False)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)