'''
File defining endpoint content.

Author: Jason Fitzpatrick 
'''


from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import json
import numpy as np
import types
from django.core.files.storage import default_storage
import os
import pandas as pd
import traceback
import platform
import logging
import math

from django.contrib.auth.models import User
from .models import UploadedImage, Measurement, BodyConditionResult, UserSession

from MMI_CODEX.collatrix.body_condition.calculate_body_area_index import calculate_body_area_index
from MMI_CODEX.collatrix.body_condition.calculate_body_volume import calculate_body_volume
from MMI_CODEX.collatrix.lidar_wrangle.wrangle_lemhex_lidar import wrangle_lemhex_lidar
from MMI_CODEX.collatrix.lidar_wrangle.wrangle_lightware_lidar import wrangle_lightware_lidar
from MMI_CODEX.collatrix.lidar_wrangle.extract_time_from_filename import extract_time_from_filename
from MMI_CODEX.collatrix.lidar_wrangle.generate_video_id import generate_video_id
from MMI_CODEX.collatrix.pyexifhelper_exiftool.helper import ExifToolHelper

from MMI_CODEX.morphometrix.calculate_widths import calculate_widths
from MMI_CODEX.morphometrix.compute_angle_between_lines import compute_angle_between_lines
from MMI_CODEX.morphometrix.compute_curve_length import compute_curve_length
from MMI_CODEX.morphometrix.compute_polygon_area import compute_polygon_area
from MMI_CODEX.morphometrix.constants import ObjectTypes
from MMI_CODEX.morphometrix.measurement import Measurement as MorphoMeasurement  # FIXED: Added alias

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

if platform.system() == "Windows":
    exiftool_path = (current_dir / ".." / "MMI_CODEX" / "collatrix" / "exiftool.exe").resolve()
else:
    exiftool_path = "exiftool"

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

    def save_measurement(self, request):
        """Save a measurement to the database with improved error handling and ruler grouping"""
        logger = logging.getLogger(__name__)
        
        try:
            data = json.loads(request.body)
            logger.info(f"Received measurement data: {data}")
            
            # Ensure session exists for anonymous users
            if not request.session.session_key:
                request.session.create()
            
            # Get current image from session 
            image_id = request.session.get('current_image_id')
            logger.info(f"Current image ID from session: {image_id}")
            
            if not image_id:
                logger.error("No current image ID in session")
                return JsonResponse({
                    "error": "No current image in session. Please upload an image first."
                }, status=400)
            
            try:
                image_record = UploadedImage.objects.get(id=image_id)
                logger.info(f"Found image record: {image_record.filename}")
            except UploadedImage.DoesNotExist:
                logger.error(f"Image with ID {image_id} not found in database")
                return JsonResponse({
                    "error": "Image not found in database"
                }, status=404)
            
            # Check session/user access
            if request.user.is_authenticated:
                if image_record.user != request.user:
                    logger.error("Authenticated user doesn't own this image")
                    return JsonResponse({"error": "Access denied"}, status=403)
            else:
                session_key = request.session.session_key
                if image_record.session_key != session_key:
                    logger.error(f"Session mismatch: image session={image_record.session_key}, current session={session_key}")
                    return JsonResponse({"error": "Session access denied"}, status=403)
            
            # Extract and validate measurement data
            measurement_type = data.get("measurement_type")
            measurement_name = data.get("measurement_name", "User Measurement")
            scaled_dimension = data.get("scaled_dimension", 0)
            coordinate_data = data.get("coordinate_data", [])
            
            if not measurement_type:
                return JsonResponse({
                    "error": "measurement_type is required"
                }, status=400)
            
            # Ensure scaled_dimension is a number
            try:
                scaled_dimension = float(scaled_dimension) if scaled_dimension is not None else 0.0
            except (ValueError, TypeError):
                scaled_dimension = 0.0
            
            # Handle ruler measurements specially
            if measurement_type == "ruler_complete":
                # This is a complete ruler measurement with width segments
                metadata = data.get("metadata", {})
                total_length = metadata.get("total_length", {})
                width_segments = metadata.get("width_segments", [])
                
                # Create the main ruler measurement
                main_measurement = Measurement.objects.create(
                    image=image_record,
                    measurement_type="ruler",
                    measurement_name=f"Ruler Measurement ({len(width_segments)} segments)",
                    scaled_dimension=scaled_dimension,
                    coordinate_data=coordinate_data,
                    measurement_metadata={
                        "total_length": total_length,
                        "segment_count": len(width_segments),
                        "width_segments_summary": [
                            {
                                "segment": f"Width {i+1}",
                                "percentage": seg.get("measurement_type", "").replace("TL_w", ""),
                                "length": seg.get("scaled_dimension", 0)
                            }
                            for i, seg in enumerate(width_segments)
                        ]
                    }
                )
                
                # Create child measurements for each width segment
                for i, segment in enumerate(width_segments):
                    Measurement.objects.create(
                        image=image_record,
                        measurement_type="width_segment",
                        measurement_name=f"Width Segment {i+1}",
                        scaled_dimension=segment.get("scaled_dimension", 0),
                        coordinate_data=segment.get("coordinate_data", []),
                        measurement_metadata={
                            "parent_measurement_id": main_measurement.id,
                            "segment_number": i + 1,
                            "percentage": segment.get("measurement_type", "").replace("TL_w", ""),
                            "original_type": segment.get("measurement_type", "")
                        }
                    )
                
                logger.info(f"Successfully created ruler measurement {main_measurement.id} with {len(width_segments)} width segments")
                
                return JsonResponse({
                    "success": True, 
                    "measurement_id": main_measurement.id,
                    "width_segments_count": len(width_segments),
                    "message": f"Saved complete ruler measurement with {len(width_segments)} width segments"
                })
            
            else:
                # Handle other measurement types normally
                measurement = Measurement.objects.create(
                    image=image_record,
                    measurement_type=measurement_type,
                    measurement_name=measurement_name,
                    scaled_dimension=scaled_dimension,
                    coordinate_data=coordinate_data,
                    measurement_metadata=data.get("metadata", {})
                )
                
                logger.info(f"Successfully created measurement {measurement.id} for image {image_id}")
                
                return JsonResponse({
                    "success": True, 
                    "measurement_id": measurement.id,
                    "message": f"Saved {measurement_type} measurement successfully"
                })
                
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in request body: {str(e)}")
            return JsonResponse({
                "error": "Invalid JSON in request body"
            }, status=400)
        except Exception as e:
            logger.error(f"Unexpected error saving measurement: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return JsonResponse({
                "error": f"Internal server error: {str(e)}"
            }, status=500)
    
    def calculate_curve(self, request):
        """
        Compute Bézier curve interpolation and arc length.

        Input: JSON with a measurement_stack containing a list of measurements with objects_params of control points (each with x, y).

        Output: JSON with interpolated curve_points and the total length of the curve.

        Axios Example: 
        axios.post("http://localhost:8000/morphometrix/calculate_curve/", {
            measurement_stack: [{
                measurement_type: "curve",
                name: "Test Curve",
                objects_params: [
                { parms: { x: 0, y: 0 } },
                { parms: { x: 1, y: 2 } },
                { parms: { x: 3, y: 3 } }
                ]
            }],
            pixel_dimension: 0.123 // OPTIONAL: This will be used to convert the output length to the unit of the pixel dimension (i.e. meters)
        }).then(response => console.log(response.data));

        """
        data = json.loads(request.body)
        measurement_stack = [MorphoMeasurement(**m) for m in data.get("measurement_stack", [])]  # FIXED: Use MorphoMeasurement
        pixel_dimension = data.get("pixel_dimension", 1)

        measurement = measurement_stack[-1]
        control_points = np.array([[obj["parms"]["x"], obj["parms"]["y"]] for obj in measurement.objects_params])

        if len(control_points) < 2:
            return JsonResponse({"error": "At least two control points required"}, status=400)

        B, length, Q, kb, P = compute_curve_length(control_points)

        try:
            pixel_dimension = float(pixel_dimension)
            length *= pixel_dimension
        except ValueError:
            return JsonResponse({"error": "Invalid pixel_dimension"}, status=400)

        measurement.measurement_value = length
        measurement.Q = Q
        measurement.kb = kb
        measurement.P = P
        measurement.objects_params.clear()

        curve_points = [{"x": float(x), "y": float(y)} for x, y in B]
        return JsonResponse({"curve_points": curve_points, "length": length})

    def calculate_length(self, request):
        """
        Compute total length of selected measurement and save to database.
        """
        data = json.loads(request.body)
        logger = logging.getLogger(__name__)
        logger.info("Received measurement: %s", data)
        measurement_data = data.get("measurement", {})
        pixel_dimension = data.get("pixel_dimension", 1)
        
        try:
            pixel_dimension = float(pixel_dimension)
        except ValueError:
            return JsonResponse({"error": "Invalid pixel_dimension"}, status=400)

        measurement = MorphoMeasurement(  # FIXED: Use MorphoMeasurement
            measurement_type=measurement_data.get("measurement_type"),
            name=measurement_data.get("measurement_name")
        )
        measurement.objects_params = measurement_data.get("objects_params", [])

        measurement.measurement_value = sum([
            obj["parms"].get("length", 0) * pixel_dimension if "length" in obj["parms"] else 0
            for obj in measurement.objects_params
        ])
        
        # Save to database
        result = {
            "scaled_dimension": measurement.measurement_value,
            "coordinate_data": measurement_data.get("objects_params", [])
        }
        self.save_measurement_to_db(request, "ruler", measurement_data, result)
        
        return JsonResponse({"length": measurement.measurement_value})

    def calculate_angle(self, request):
        """
        Compute the angle between two line segments.

        Input: JSON with a measurement containing two objects_params with parms for endpoints (x1, y1, x2, y2).

        Output: JSON with the calculated angle.

        Axios Example:
        axios.post("http://localhost:8000/morphometrix/calculate_angle/", {
            measurement: {
                measurement_type: 3,
                name: "Test Angle Measurement",
                objects_params: [
                { type: 1, parms: { x1: 0, y1: 0, x2: 1, y2: 1 } },
                { type: 1, parms: { x1: 0, y1: 0, x2: 1, y2: -1 } }
                ]
            }
        }).then(response => console.log(response.data));
        """

        try:
            data = json.loads(request.body)
            measurement = MorphoMeasurement(**data.get("measurement"))  # FIXED: Use MorphoMeasurement
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
        """
        Compute area using the Shoelace formula.

        Input: JSON with a measurement containing an objects_params entry of type polygon (type 5) and its list of x, y vertices in parms.

        Output: JSON with the calculated area.

        Axios Example:
        axios.post("http://localhost:8000/morphometrix/calculate_area/", {
            measurement: {
                measurement_type: 2,
                name: "Test Area Measurement",
                objects_params: [
                {
                    type: 5,
                    parms: [
                    { x: 0, y: 0 },
                    { x: 4, y: 0 },
                    { x: 4, y: 3 },
                    { x: 0, y: 3 }
                    ]
                }
                ]
            },
            pixel_dimension: 0.123 // OPTIONAL: This will be used to convert the output length to the unit of the pixel dimension (i.e. meters)
        }).then(response => console.log(response.data));
        """
        data = json.loads(request.body)
        measurement = MorphoMeasurement(**data.get("measurement"))  # FIXED: Use MorphoMeasurement
        pixel_dimension = data.get("pixel_dimension", 1)

        qpolygon = [obj["parms"] for obj in measurement.objects_params if obj["type"] == ObjectTypes.POLYGONITEM]

        if not qpolygon:
            return JsonResponse({"error": "No polygon found"}, status=400)

        area = compute_polygon_area(qpolygon[0])
        try:
            pixel_dimension = float(pixel_dimension)
            area *= pixel_dimension ** 2
        except ValueError:
            return JsonResponse({"error": "Invalid pixel_dimension"}, status=400)
        measurement.measurement_value = area

        return JsonResponse({"area": measurement.measurement_value})
    
    def calculate_widths(self, data):
        """Compute width measurements."""
        measurement_stack = [MorphoMeasurement(**m) for m in data.get("measurement_stack", [])]  # FIXED: Use MorphoMeasurement
        bias = data.get("bias", None)
        pixel_dimension = data.get("pixel_dimension", 1)

        try:
            pixel_dimension = float(pixel_dimension)
            for m in measurement_stack:
                for obj in m.objects_params:
                    if "length" in obj["parms"]:
                        obj["parms"]["length"] *= pixel_dimension
        except ValueError:
            return {"success": False, "message": "Invalid pixel_dimension"}

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
        # Check if exiftool_path is defined and exists, otherwise use default
        if 'exiftool_path' not in globals() or not os.path.exists(str(exiftool_path)):
            exiftool_executable = "/usr/bin/exiftool"  # Standard path for Debian-based systems
        else:
            exiftool_executable = str(exiftool_path)
        
        # Use the determined executable path, not the global exiftool_path
        self.exiftool = ExifToolHelper(executable=exiftool_executable) 

    def post(self, request, function_name):
        """
        Routes requests to the appropriate function based on the URL path.
        """
        # Add logging to debug
        logger = logging.getLogger(__name__)
        logger.info(f"CollatriX POST request: function_name={function_name}")
        
        if function_name == "update_whale_info":
            return self.update_whale_info(request)
        elif function_name == "delete_image":
            image_id = request.GET.get('image_id') or request.POST.get('image_id')
            logger.info(f"Delete image request: image_id={image_id}")
            if not image_id:
                return JsonResponse({"error": "image_id parameter required"}, status=400)
            return self.delete_image(request, image_id)
        elif function_name == "delete_measurement":
            measurement_id = request.GET.get('measurement_id') or request.POST.get('measurement_id')
            logger.info(f"Delete measurement request: measurement_id={measurement_id}")
            if not measurement_id:
                return JsonResponse({"error": "measurement_id parameter required"}, status=400)
            return self.delete_measurement(request, measurement_id)
        elif function_name == "calculate_body_condition":
            return self.calculate_body_condition(request)
        elif function_name == "save_measurement":
            return self.save_measurement(request)
        elif function_name == "lidar_wrangle":
            return self.lidar_wrangle(request)
        elif function_name == "lidar_image":
            return self.lidar_image(request)
        elif function_name == "collate_morphometrix":
            return self.collate_morphometrix(request)
        elif function_name == "extract_metadata":
            return self.extract_metadata(request)
        elif function_name == "compute_pixel_dimension":
            return self.compute_pixel_dimension(request)
        elif function_name == "get_user_images":
            return self.get_user_images(request)
        elif function_name == "get_image_measurements":
            image_id = request.GET.get('image_id')
            return self.get_image_measurements(request, image_id)
        else:
            logger.warning(f"Invalid function name: {function_name}")
            return JsonResponse({"error": f"Invalid function name: {function_name}"}, status=400)

    def update_whale_info(self, request):
        """Update whale name and ID for an image immediately"""
        logger = logging.getLogger(__name__)
        
        try:
            data = json.loads(request.body)
            image_id = data.get('image_id')
            whale_name = data.get('whale_name', '').strip()
            whale_id = data.get('whale_id', '').strip()
            
            logger.info(f"Updating whale info for image {image_id}: name='{whale_name}', id='{whale_id}'")
            
            if not image_id:
                return JsonResponse({'error': 'image_id is required'}, status=400)
            
            try:
                image = UploadedImage.objects.get(id=image_id)
            except UploadedImage.DoesNotExist:
                logger.error(f"Image {image_id} not found")
                return JsonResponse({'error': 'Image not found'}, status=404)
            
            # Check permissions
            if request.user.is_authenticated:
                if image.user != request.user:
                    logger.error(f"Access denied: user {request.user.id} trying to update image owned by {image.user}")
                    return JsonResponse({'error': 'Access denied'}, status=403)
            else:
                session_key = request.session.session_key
                if not session_key:
                    logger.error("No session key found")
                    return JsonResponse({'error': 'Session access denied'}, status=403)
                if image.session_key != session_key:
                    logger.error(f"Session mismatch: image session={image.session_key}, current session={session_key}")
                    return JsonResponse({'error': 'Session access denied'}, status=403)
            
            # Update whale information
            old_whale_name = image.whale_name
            old_whale_id = image.whale_id
            
            image.whale_name = whale_name if whale_name else None
            image.whale_id = whale_id if whale_id else None
            image.save()
            
            logger.info(f"Successfully updated whale info for image {image_id}")
            logger.info(f"Changed from '{old_whale_name}' ({old_whale_id}) to '{whale_name}' ({whale_id})")
            
            return JsonResponse({
                'success': True,
                'message': f'Updated whale info to {whale_name} ({whale_id})',
                'whale_name': image.whale_name,
                'whale_id': image.whale_id
            })
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in request body: {str(e)}")
            return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)
        except Exception as e:
            logger.error(f"Unexpected error updating whale info: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return JsonResponse({'error': f'Internal server error: {str(e)}'}, status=500)


    def delete_image(self, request, image_id):
        """Delete an image and all its measurements"""
        logger = logging.getLogger(__name__)
        logger.info(f"Starting delete_image for ID: {image_id}")
        
        try:
            # Get the image
            try:
                image = UploadedImage.objects.get(id=image_id)
                logger.info(f"Found image: {image.filename}")
            except UploadedImage.DoesNotExist:
                logger.error(f"Image not found: {image_id}")
                return JsonResponse({'error': 'Image not found'}, status=404)
            except ValueError as e:
                logger.error(f"Invalid image ID format: {image_id}, error: {str(e)}")
                return JsonResponse({'error': 'Invalid image ID format'}, status=400)
            
            # Check permissions
            if request.user.is_authenticated:
                if image.user != request.user:
                    logger.error(f"Access denied: user {request.user.id} trying to delete image owned by {image.user}")
                    return JsonResponse({'error': 'Access denied'}, status=403)
            else:
                session_key = request.session.session_key
                if not session_key:
                    logger.error("No session key found")
                    return JsonResponse({'error': 'Session access denied'}, status=403)
                if image.session_key != session_key:
                    logger.error(f"Session mismatch: image session={image.session_key}, current session={session_key}")
                    return JsonResponse({'error': 'Session access denied'}, status=403)
            
            # Store info for response
            whale_info = f" for {image.whale_id}" if image.whale_id else ""
            filename = image.filename
            measurement_count = image.measurements.count()
            
            # Delete the image (this will cascade delete all measurements)
            image.delete()
            
            logger.info(f"Successfully deleted image {image_id} ({filename}) with {measurement_count} measurements")
            
            return JsonResponse({
                'success': True,
                'message': f'Deleted {filename}{whale_info} and {measurement_count} measurements'
            })
            
        except Exception as e:
            logger.error(f"Error deleting image {image_id}: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return JsonResponse({'error': f'Failed to delete image: {str(e)}'}, status=500)

    def delete_measurement(self, request, measurement_id):
        """Delete a specific measurement"""
        logger = logging.getLogger(__name__)
        logger.info(f"Starting delete_measurement for ID: {measurement_id}")
        
        try:
            # Get the measurement
            try:
                measurement = Measurement.objects.get(id=measurement_id)
                logger.info(f"Found measurement: {measurement.measurement_type}")
            except Measurement.DoesNotExist:
                logger.error(f"Measurement not found: {measurement_id}")
                return JsonResponse({'error': 'Measurement not found'}, status=404)
            except ValueError as e:
                logger.error(f"Invalid measurement ID format: {measurement_id}, error: {str(e)}")
                return JsonResponse({'error': 'Invalid measurement ID format'}, status=400)
            
            # Check permissions through the image
            image = measurement.image
            if request.user.is_authenticated:
                if image.user != request.user:
                    logger.error(f"Access denied: user {request.user.id} trying to delete measurement from image owned by {image.user}")
                    return JsonResponse({'error': 'Access denied'}, status=403)
            else:
                session_key = request.session.session_key
                if not session_key:
                    logger.error("No session key found")
                    return JsonResponse({'error': 'Session access denied'}, status=403)
                if image.session_key != session_key:
                    logger.error(f"Session mismatch: image session={image.session_key}, current session={session_key}")
                    return JsonResponse({'error': 'Session access denied'}, status=403)
            
            # Store info for response
            measurement_type = measurement.measurement_type
            whale_info = f" for {image.whale_id}" if image.whale_id else ""
            
            # If this is a ruler_complete measurement, also delete child width_segments
            child_count = 0
            if measurement.measurement_type == "ruler_complete":
                try:
                    # Get all width segments for this image
                    child_segments = Measurement.objects.filter(
                        image=image,
                        measurement_type="width_segment"
                    )
                    
                    # Filter by checking the metadata in Python
                    children_to_delete = []
                    for child in child_segments:
                        try:
                            metadata = child.measurement_metadata
                            if isinstance(metadata, str):
                                metadata = json.loads(metadata)
                            if metadata and metadata.get("parent_measurement_id") == measurement.id:
                                children_to_delete.append(child)
                        except (json.JSONDecodeError, TypeError, AttributeError):
                            continue
                    
                    # Delete the found children
                    for child in children_to_delete:
                        child.delete()
                    
                    child_count = len(children_to_delete)
                    logger.info(f"Deleted {child_count} child width segments")
                except Exception as e:
                    logger.warning(f"Could not delete child segments: {str(e)}")
                    # Continue with deleting the main measurement
            
            # Delete the measurement
            measurement.delete()
            
            logger.info(f"Successfully deleted {measurement_type} measurement {measurement_id}{whale_info}")
            
            message = f'Deleted {measurement_type} measurement{whale_info}'
            if child_count > 0:
                message += f' and {child_count} width segments'
            
            return JsonResponse({
                'success': True,
                'message': message
            })
            
        except Exception as e:
            logger.error(f"Error deleting measurement {measurement_id}: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return JsonResponse({'error': f'Failed to delete measurement: {str(e)}'}, status=500)
    
    def save_measurement(self, request):
            """Save a measurement to the database with improved whale name handling"""
            logger = logging.getLogger(__name__)
            
            try:
                data = json.loads(request.body)
                logger.info(f"Received measurement data: {data}")
                
                # Ensure session exists for anonymous users
                if not request.session.session_key:
                    request.session.create()
                
                # Get current image from session 
                image_id = request.session.get('current_image_id')
                logger.info(f"Current image ID from session: {image_id}")
                
                if not image_id:
                    logger.error("No current image ID in session")
                    return JsonResponse({
                        "error": "No current image in session. Please upload an image first."
                    }, status=400)
                
                try:
                    image_record = UploadedImage.objects.get(id=image_id)
                    logger.info(f"Found image record: {image_record.filename}")
                except UploadedImage.DoesNotExist:
                    logger.error(f"Image with ID {image_id} not found in database")
                    return JsonResponse({
                        "error": "Image not found in database"
                    }, status=404)
                
                # Check session/user access
                if request.user.is_authenticated:
                    if image_record.user != request.user:
                        logger.error("Authenticated user doesn't own this image")
                        return JsonResponse({"error": "Access denied"}, status=403)
                else:
                    session_key = request.session.session_key
                    if image_record.session_key != session_key:
                        logger.error(f"Session mismatch: image session={image_record.session_key}, current session={session_key}")
                        return JsonResponse({"error": "Session access denied"}, status=403)
                
                # Extract measurement data
                measurement_type = data.get("measurement_type")
                measurement_name = data.get("measurement_name", "User Measurement")
                scaled_dimension = data.get("scaled_dimension", 0)
                coordinate_data = data.get("coordinate_data", [])
                metadata = data.get("metadata", {})
                
                if not measurement_type:
                    return JsonResponse({
                        "error": "measurement_type is required"
                    }, status=400)
                
                # Ensure scaled_dimension is a number
                try:
                    scaled_dimension = float(scaled_dimension) if scaled_dimension is not None else 0.0
                except (ValueError, TypeError):
                    scaled_dimension = 0.0
                
                # FIXED: Update image record with whale information if provided
                whale_name = metadata.get("whale_name")
                whale_id = metadata.get("whale_id")
                
                if whale_name and not image_record.whale_name:
                    # First time setting whale name for this image
                    image_record.whale_name = whale_name
                    image_record.whale_id = whale_id or image_record.generate_whale_id()
                    image_record.save()
                    logger.info(f"Updated image whale info: name={whale_name}, id={image_record.whale_id}")
                elif whale_name and image_record.whale_name != whale_name:
                    # Whale name changed - update it
                    image_record.whale_name = whale_name
                    image_record.whale_id = whale_id or image_record.generate_whale_id()
                    image_record.save()
                    logger.info(f"Changed image whale info: name={whale_name}, id={image_record.whale_id}")
                
                # Handle ruler measurements specially
                if measurement_type == "ruler_complete":
                    # This is a complete ruler measurement with width segments
                    metadata = data.get("metadata", {})
                    total_length = metadata.get("total_length", {})
                    width_segments = metadata.get("width_segments", [])
                    
                    # Create the main ruler measurement
                    main_measurement = Measurement.objects.create(
                        image=image_record,
                        measurement_type="ruler_complete",
                        measurement_name=f"Ruler Measurement ({len(width_segments)} segments)",
                        scaled_dimension=scaled_dimension,
                        coordinate_data=coordinate_data,
                        measurement_metadata={
                            "total_length": total_length,
                            "segment_count": len(width_segments),
                            "width_segments_summary": [
                                {
                                    "segment": f"Width {i+1}",
                                    "percentage": seg.get("measurement_type", "").replace("TL_w", ""),
                                    "length": seg.get("scaled_dimension", 0)
                                }
                                for i, seg in enumerate(width_segments)
                            ],
                            "whale_name": whale_name,
                            "whale_id": image_record.whale_id,
                            **metadata  # Include all other metadata
                        }
                    )
                    
                    # Create child measurements for each width segment
                    for i, segment in enumerate(width_segments):
                        Measurement.objects.create(
                            image=image_record,
                            measurement_type="width_segment",
                            measurement_name=f"Width Segment {i+1}",
                            scaled_dimension=segment.get("scaled_dimension", 0),
                            coordinate_data=segment.get("coordinate_data", []),
                            measurement_metadata={
                                "parent_measurement_id": main_measurement.id,
                                "segment_number": i + 1,
                                "percentage": segment.get("measurement_type", "").replace("TL_w", ""),
                                "original_type": segment.get("measurement_type", ""),
                                "whale_name": whale_name,
                                "whale_id": image_record.whale_id,
                            }
                        )
                    
                    logger.info(f"Successfully created ruler measurement {main_measurement.id} with {len(width_segments)} width segments")
                    
                    return JsonResponse({
                        "success": True, 
                        "measurement_id": main_measurement.id,
                        "width_segments_count": len(width_segments),
                        "whale_id": image_record.whale_id,
                        "message": f"Saved complete ruler measurement with {len(width_segments)} width segments"
                    })
                
                else:
                    # Handle other measurement types normally
                    measurement = Measurement.objects.create(
                        image=image_record,
                        measurement_type=measurement_type,
                        measurement_name=measurement_name,
                        scaled_dimension=scaled_dimension,
                        coordinate_data=coordinate_data,
                        measurement_metadata={
                            **metadata,
                            "whale_name": whale_name,
                            "whale_id": image_record.whale_id,
                        }
                    )
                    
                    logger.info(f"Successfully created measurement {measurement.id} for image {image_id}")
                    
                    return JsonResponse({
                        "success": True, 
                        "measurement_id": measurement.id,
                        "whale_id": image_record.whale_id,
                        "message": f"Saved {measurement_type} measurement successfully"
                    })
                    
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in request body: {str(e)}")
                return JsonResponse({
                    "error": "Invalid JSON in request body"
                }, status=400)
            except Exception as e:
                logger.error(f"Unexpected error saving measurement: {str(e)}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                return JsonResponse({
                    "error": f"Internal server error: {str(e)}"
                }, status=500)

    def get_or_create_session(self, request):
        """Get or create session for anonymous users"""
        if not request.session.session_key:
            request.session.create()
        
        session_key = request.session.session_key
        user_session, created = UserSession.objects.get_or_create(
            session_key=session_key,
            defaults={'session_key': session_key}
        )
        if not created:
            # Update last activity
            user_session.save()
        
        return session_key
    
    def extract_metadata(self, request):
        """
        Extracts metadata from an uploaded image and saves to database.
        Ensures session is properly created and image ID is stored.
        """
        logger = logging.getLogger(__name__)
        
        def to_float(value):
            try:
                return float(value)
            except (TypeError, ValueError):
                return value

        if 'image' not in request.FILES:
            return JsonResponse({"error": "No image file provided"}, status=400)

        uploaded_image = request.FILES['image']
        image_path = default_storage.save(uploaded_image.name, uploaded_image)
        
        logger.info(f"Processing image: {uploaded_image.name}")

        try:
            # Ensure session exists
            if not request.session.session_key:
                request.session.create()
                logger.info(f"Created new session: {request.session.session_key}")
            
            # Extract metadata using exiftool
            with self.exiftool as et:
                metadata = et.get_metadata(image_path)[0]
            
            # Prepare response data
            response_data = {
                "timestamp": metadata.get("EXIF:DateTimeOriginal", "Unknown"),
                "file_name": metadata.get("File:FileName", os.path.basename(image_path)),
                "file_size_bytes": metadata.get("File:FileSize", None),
                "image_width": to_float(metadata.get("File:ImageWidth")),
                "image_height": to_float(metadata.get("File:ImageHeight")),
                "megapixels": to_float(metadata.get("Composite:Megapixels", None)),
                "camera_make": metadata.get("EXIF:Make", "Unknown"),
                "camera_model": metadata.get("EXIF:Model", "Unknown"),
                "lens_info": metadata.get("EXIF:LensInfo", "Unknown"),
                "serial_number": metadata.get("EXIF:SerialNumber", "Unknown"),
                "shutter_speed_sec": to_float(metadata.get("EXIF:ShutterSpeedValue", None)),
                "aperture_f_number": to_float(metadata.get("EXIF:ApertureValue", None)),
                "iso": to_float(metadata.get("EXIF:ISO", None)),
                "focal_length_mm": to_float(metadata.get("EXIF:FocalLength", None)),
                "focal_length_35mm_equiv": to_float(metadata.get("EXIF:FocalLengthIn35mmFormat", None)),
                "exposure_compensation": to_float(metadata.get("EXIF:ExposureCompensation", None)),
                "white_balance": "Auto" if metadata.get("EXIF:WhiteBalance") == 0 else "Manual",
                "digital_zoom_ratio": to_float(metadata.get("EXIF:DigitalZoomRatio", None)),
                "gps_latitude": to_float(metadata.get("XMP:GPSLatitude", None)),
                "gps_longitude": to_float(metadata.get("XMP:GPSLongitude", None)),
                "gps_altitude_m": to_float(metadata.get("XMP:RelativeAltitude", None)),
                "gimbal_pitch_deg": to_float(metadata.get("XMP:GimbalPitchDegree", None)),
                "gimbal_yaw_deg": to_float(metadata.get("XMP:GimbalYawDegree", None)),
                "gimbal_roll_deg": to_float(metadata.get("XMP:GimbalRollDegree", None)),
                "drone_pitch_deg": to_float(metadata.get("XMP:FlightPitchDegree", None)),
                "drone_yaw_deg": to_float(metadata.get("XMP:FlightYawDegree", None)),
                "drone_roll_deg": to_float(metadata.get("XMP:FlightRollDegree", None)),
                "sensor_temperature_c": to_float(metadata.get("XMP:SensorTemperature", None)),
                "sensor_fps": to_float(metadata.get("XMP:SensorFPS", None)),
                "field_of_view_deg": to_float(metadata.get("Composite:FOV", None)),
                "hyperfocal_distance_m": to_float(metadata.get("Composite:HyperfocalDistance", None)),
                "light_value_ev": to_float(metadata.get("Composite:LightValue", None)),
            }

            # Save to database if user is authenticated or track by session
            user = request.user if request.user.is_authenticated else None
            session_key = None if user else request.session.session_key
            
            logger.info(f"Saving image for user: {user}, session: {session_key}")
            
            # Create UploadedImage record
            uploaded_image_record = UploadedImage.objects.create(
                user=user,
                session_key=session_key,
                filename=uploaded_image.name,
                original_filename=uploaded_image.name,
                focal_length_mm=response_data.get("focal_length_mm"),
                gps_altitude_m=response_data.get("gps_altitude_m"),
                image_width=response_data.get("image_width"),
                image_height=response_data.get("image_height"),
                field_of_view_deg=response_data.get("field_of_view_deg"),
                camera_make=response_data.get("camera_make"),
                camera_model=response_data.get("camera_model"),
                timestamp=response_data.get("timestamp"),
                gps_latitude=response_data.get("gps_latitude"),
                gps_longitude=response_data.get("gps_longitude"),
            )
            
            # Add image_id to response so frontend can track it
            response_data["image_id"] = uploaded_image_record.id
            
            # Store image_id in session for future requests
            request.session['current_image_id'] = uploaded_image_record.id
            request.session.save()  # Explicitly save the session
            
            logger.info(f"Successfully saved image with ID: {uploaded_image_record.id}")
            logger.info(f"Session current_image_id set to: {request.session.get('current_image_id')}")
            
            return JsonResponse(response_data)

        except Exception as e:
            logger.error(f"Error extracting metadata: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return JsonResponse({"error": str(e)}, status=500)

        finally:
            if os.path.exists(image_path):
                os.remove(image_path)

    def compute_pixel_dimension(self, request):
        """
        Computes pixel dimension in meters/pixel using one of two formula options:

        Option A:
            - altitude (meters)
            - fov (degrees)
            - image_width (pixels)

        Option B:
            - altitude (meters)
            - focal_length (mm)
            - sensor_width (mm)
            - image_width (pixels)

        Input: JSON POST request with required fields for one of the formulas.

        Axios Example
        // Option A: Using FOV
        axios.post("http://localhost:8000/collatrix/compute_pixel_dimension/", {
        altitude: 22.7,
        fov: 28.84,
        image_width: 8064
        }).then(res => console.log(res.data));

        // Option B: Using focal length and sensor width
        axios.post("http://localhost:8000/collatrix/compute_pixel_dimension/", {
        altitude: 22.7,
        focal_length: 19.35, // in mm
        sensor_width: 13.2,  // in mm (e.g., for 1" sensor)
        image_width: 8064
        }).then(res => console.log(res.data));

        Output: {"pixel_dimension": <meters_per_pixel>}
        """
        try:
            data = json.loads(request.body)

            # Option A
            if all(key in data for key in ("altitude", "fov", "image_width")):
                altitude = float(data["altitude"])
                fov_deg = float(data["fov"])
                image_width = int(data["image_width"])
                fov_rad = math.radians(fov_deg)
                scene_width_m = 2 * altitude * math.tan(fov_rad / 2)
                pixel_dimension = scene_width_m / image_width

            # Option B
            elif all(key in data for key in ("altitude", "focal_length", "sensor_width", "image_width")):
                altitude = float(data["altitude"])
                focal_length = float(data["focal_length"])  # in mm
                sensor_width = float(data["sensor_width"])  # in mm
                image_width = int(data["image_width"])
                pixel_dimension = (altitude / focal_length) * (sensor_width / image_width)

            else:
                return JsonResponse({
                    "error": "Missing required parameters. Provide either: (altitude, fov, image_width) OR (altitude, focal_length, sensor_width, image_width)."
                }, status=400)

            return JsonResponse({"pixel_dimension": pixel_dimension})

        except (ValueError, TypeError, KeyError) as e:
            return JsonResponse({"error": f"Invalid input: {str(e)}"}, status=400)
        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"error": str(e)}, status=500)

    def calculate_body_condition(self, request):
        """
        Calculates cetacean body condition metrics based on uploaded measurements.

        Input: JSON object with measurements array, bv_method, bai_method, tl_name, and optional range/interval params.

        Output: JSON array with calculated metrics (e.g., BVcir, BAIpar, SA) per image.

        Axios Example:
        axios.post("http://localhost:8000/collatrix/calculate-body-condition/", {
        measurements: [...],  // array of measurement objects
        bv_method: "Circle",
        bai_method: "Parabola",
        tl_name: "Length",
        interval: 5,
        lower: 0,
        upper: 30
        }).then(response => console.log(response.data));
        """
        data = json.loads(request.body)
        df = pd.DataFrame(data["measurements"])

        bv_method = data.get("bv_method")
        bai_method = data.get("bai_method")
        tl_name = data.get("tl_name")
        interval = float(data.get("interval", 5))
        lower = float(data.get("lower", 0))
        upper = float(data.get("upper", 100))

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

        Input: multipart/form-data with files (one or more), lidar_type, and (if needed) gimbal_type.

        Output: JSON array of LiDAR readings with corrected timestamps and altitudes.

        Axios Example:
        const formData = new FormData();
        formData.append("files", lidarFile1);
        formData.append("files", lidarFile2);
        formData.append("lidar_type", "LightWare");
        formData.append("gimbal_type", "fixed");

        axios.post("http://localhost:8000/collatrix/lidar-wrangle/", formData)
        .then(response => console.log(response.data));
        """
        lidar_type = request.POST.get('lidar_type')
        gimbal_type = request.POST.get('gimbal_type')

        if 'files' not in request.FILES:
            return JsonResponse({"error": "LiDAR files required"}, status=400)

        files = request.FILES.getlist('files')
        file_paths = [default_storage.save(file.name, file) for file in files]

        try:
            if lidar_type == "LightWare":
                if not gimbal_type:
                    return JsonResponse({"error": "Gimbal type is required for LightWare"}, status=400)

                laser_all = wrangle_lightware_lidar(file_paths, gimbal_type)

            elif lidar_type == "LemHex":
                laser_all = wrangle_lemhex_lidar(file_paths)

            else:
                return JsonResponse({"error": "Invalid LiDAR type"}, status=400)

            return JsonResponse(laser_all.to_dict(orient='records'), safe=False)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

        finally:
            for file_path in file_paths:
                os.remove(file_path)

    

    def lidar_image(self, request):
        """
        Extract metadata from images and match with LiDAR data.

        Input: multipart/form-data with image_files, gps_data, lidar_data, time_window, flight_ixs, and delimiter.

        Output: JSON array with image names and corresponding LiDAR altitudes.

        Axios Example:
        const formData = new FormData();
        formData.append("image_files", image1);
        formData.append("image_files", image2);
        formData.append("gps_data", JSON.stringify([
        { FlightID: "ARG_20250123_1_1", GPS_DT: "2025-03-18T14:30:00" },
        { FlightID: "ARG_20250201_1_1", GPS_DT: "2025-03-18T14:31:00" }
        ]));
        formData.append("lidar_data", JSON.stringify([
        { CorrDT: "2025-03-18T14:30:05", Laser_Alt: 12.5 }
        ]));
        formData.append("time_window", "60");
        formData.append("flight_ixs", JSON.stringify([0, 1, 2, 3]));
        formData.append("delimiter", "_");

        axios.post("http://localhost:8000/collatrix/lidar-image/", formData)
        .then(response => console.log(response.data));
        """
        try:
            gps_data = json.loads(request.POST.get("gps_data", "[]"))
            lidar_data = json.loads(request.POST.get("lidar_data", "[]"))
            time_window = float(request.POST.get("time_window", 5))

            files = request.FILES.getlist('image_files')

            if not files or not gps_data or not lidar_data:
                return JsonResponse({"error": "Image files, GPS data, and LiDAR data are required"}, status=400)
            

            image_paths = [default_storage.save(file.name, file) for file in files]
        
            flight_ixs = json.loads(request.POST.get("flight_ixs", "[]"))
            delimiter = request.POST.get("delimiter", "_")

            df_images = self._extract_image_metadata(image_paths, self.exiftool, flight_ixs, delimiter)

            df_gps = pd.DataFrame(gps_data)
            df_lidar = pd.DataFrame(lidar_data)

            df_gps['GPS_DT'] = pd.to_datetime(df_gps['GPS_DT'])
            df_images['ImageDT'] = pd.to_datetime(df_images['ImageDT'])

            df_img_x = df_images.merge(
                df_gps[['FlightID', 'GPS_DT']],
                on='FlightID',
                how='left'
            )
            df_img_x['offset'] = df_img_x['GPS_DT'] - df_img_x['ImageDT']

            df_img_x['CorrDT'] = df_img_x['ImageDT'] + df_img_x['offset']

            df_lidar['CorrDT'] = pd.to_datetime(df_lidar['CorrDT'])

            if time_window > 0:
                df_img_x = df_img_x.sort_values('CorrDT')
                df_lidar = df_lidar.sort_values('CorrDT')

                df_lidarmerge = pd.merge_asof(
                    df_img_x,
                    df_lidar[['CorrDT', 'Laser_Alt']],
                    on="CorrDT",
                    tolerance=pd.Timedelta(seconds=time_window),
                    direction="nearest"
                )
            else:
                df_lidarmerge = df_img_x.merge(
                    df_lidar[['CorrDT', 'Laser_Alt']],
                    how='left',
                    on='CorrDT'
                )

            result = df_lidarmerge[['SourceFile', 'Image', 'Laser_Alt']]
            result = result.replace({np.nan: None})

            return JsonResponse(result.to_dict(orient="records"), safe=False)

        except Exception as e:
            print(f"EXCEPTION: {str(e)}")
            return JsonResponse({
                "error": str(e),
            }, status=500)
        finally:
            for path in image_paths:
                try:
                    os.remove(path)
                    print(f"Removed {path}")
                except Exception as cleanup_error:
                    print(f"Failed to remove {path}: {cleanup_error}")

    def _extract_image_metadata(self, image_paths, et, flight_ixs=None, delimiter="_"):
        """
        Internal method for extracting image metadata using ExifTool.
        """
        df_images = pd.DataFrame()
        tagnames = []

        try:

            for d in et.get_metadata(image_paths):
                tempdict = {k: v for k, v in d.items()}
                tagnames.extend(tempdict.keys())
                tempdf = pd.DataFrame(data=tempdict, index=[0])
                df_images = pd.concat([df_images, tempdf]).reset_index(drop=True)
            tagnames = list(set(tagnames))

            
            name_tag = next((x for x in tagnames if 'File:FileName' in x), None)
            date_tag = next(
                (x for x in tagnames if 'EXIF:CreateDate' in x or 'EXIF:DateTimeOriginal' in x), 
                None
            )
            if not name_tag or not date_tag:
                raise ValueError("Required EXIF tags not found in image metadata.")
            df_images = df_images.rename(columns={
                name_tag: 'Image',
                date_tag: 'ImageDT'
            })

            df_images['ImageDT'] = pd.to_datetime(df_images['ImageDT'], format='%Y:%m:%d %H:%M:%S', errors="coerce")

            if flight_ixs:
                df_images['FlightID'] = [
                    delimiter.join(x.split(delimiter)[i] for i in flight_ixs)
                    for x in df_images['Image']
                ]

            return df_images
        finally:
            et.terminate()

    def collate_morphometrix(self, request):
        """
        Collates and processes multiple MorphoMetriX CSV files into a single dataset.

        Input: multipart/form-data with multiple csv_files, optional safe_file_path, and config fields (prefix, use_folder_as_animal_id, output_option).

        Output: JSON object with merged measurements (meters/pixels) and processing notes.

        Axios Example:
        const formData = new FormData();
        formData.append("csv_files", file1);
        formData.append("csv_files", file2);
        formData.append("safe_file_path", safetyFile);
        formData.append("prefix", "output");
        formData.append("use_folder_as_animal_id", "false");
        formData.append("output_option", "Both in one file");

        axios.post("http://localhost:8000/collatrix/collate-morphometrix/", formData)
        .then(response => console.log(response.data));
        """
        try:
            prefix = request.POST.get("prefix", "output")
            use_folder_as_animal_id = request.POST.get("use_folder_as_animal_id", "false") == "true"
            output_option = request.POST.get("output_option", "Both in one file")

            csv_files = request.FILES.getlist('csv_files')
            if not csv_files:
                return JsonResponse({"error": "CSV files are required"}, status=400)

            csvs = []
            not_mmx = []
            duplicate_csvs = []
            decoded_csvs = []

            for file in csv_files:
                df = pd.read_csv(file)
                if 'Value_unit' in df.columns:
                    df['csv'] = file.name
                    decoded_csvs.append(df)
                    csvs.append(file.name)
                else:
                    not_mmx.append(file.name)

            if not decoded_csvs:
                return JsonResponse({"error": "No valid CSV files provided"}, status=400)

            df_all = pd.concat(decoded_csvs, ignore_index=True)

            df_all['Object'] = df_all['Object'].astype(str)
            df_all['Object'] = df_all['Object'].apply(
                lambda x: x.replace(".0", ".00") if ".00" not in x else x
            )
            df_all['Object'] = df_all['Object'].apply(
                lambda x: "{0}_w{1}".format(
                    x.split("_w")[0], str(x.split("w")[1]).rjust(5, "0")
                ) if "_w" in x else x
            )

            if use_folder_as_animal_id:
                df_all["Image_ID"] = df_all["Image_Path"].apply(lambda x: Path(x).parts[-2])

            dup_check = df_all[df_all['Value_unit'] == 'Meters']
            if dup_check.duplicated(subset=['Image', 'Object', 'csv'], keep=False).any():
                duplicate_csvs = dup_check[dup_check.duplicated(subset=['Image', 'Object', 'csv'], keep=False)]
                if not duplicate_csvs.empty:
                    return JsonResponse(
                        {
                            "error": "Duplicate measurements found",
                            "duplicates": duplicate_csvs.to_dict(orient="records")
                        },
                        status=400
                    )

            df_meta = df_all[df_all["Value_unit"] == "Metadata"]
            df_meters = df_all[df_all["Value_unit"].isin(["Meters", "Square Meters", "Degrees"])]
            df_pixels = df_all[df_all["Value_unit"].isin(["Pixels", "Degrees"])]

            safe_file = request.FILES.get('safe_file_path')
            safe_df = None
            if safe_file:
                safe_df = pd.read_csv(safe_file)

                df_meta['Image'] = df_meta['Image'].astype(str)
                safe_df['Image'] = safe_df['Image'].astype(str)
                
                df_meters['Altitude'] = df_meters['Image'].map(safe_df.set_index('Image')['Altitude'])
                df_meters['Focal_Length'] = df_meters['Image'].map(safe_df.set_index('Image')['Focal_Length'])
                df_meters['Pixel_Dimension'] = df_meters['Image'].map(safe_df.set_index('Image')['Pixel_Dimension'])

                df_meters["Value_m"] = (
                    df_meters["Altitude"] / df_meters["Focal_Length"] *
                    df_meters["Pixel_Dimension"] * df_meters["Value"].astype(float)
                )

                df_meters["metadata_source"] = "safety_file"
                df_pixels["metadata_source"] = "safety_file"
            else:
                df_meters["metadata_source"] = "mmx_input"
                df_pixels["metadata_source"] = "mmx_input"

            if not df_meta.empty:
                df_meta_pivot = df_meta.pivot(index=["Image", "csv"], columns="Object", values="Value").reset_index()
            else:
                df_meta_pivot = None

            if not df_meters.empty:
                df_mx = df_meters.pivot(index=["Image", "csv"], columns="Object", values="Value_m").reset_index()
            else:
                df_mx = None

            if not df_pixels.empty:
                df_px = df_pixels.pivot(index=["Image", "csv"], columns="Object", values="Value").reset_index()
            else:
                df_px = None

            if df_mx is not None and df_px is not None:
                df_combined = df_mx.merge(df_px, on=["Image", "csv"], suffixes=("_m", "_px"))
            else:
                df_combined = df_mx if df_mx is not None else df_px


            response_data = {}
            if output_option == "Both in one file":
                response_data["combined"] = df_combined.to_dict(orient="records")
            elif output_option == "Both in separate files":
                if df_mx is not None:
                    response_data["meters"] = df_mx.to_dict(orient="records")
                if df_px is not None:
                    response_data["pixels"] = df_px.to_dict(orient="records")
            elif output_option == "Just meters" and df_mx is not None:
                response_data["meters"] = df_mx.to_dict(orient="records")
            elif output_option == "Just pixels" and df_px is not None:
                response_data["pixels"] = df_px.to_dict(orient="records")

            processing_notes = f"""
            Prefix: {prefix}
            Use Folder as Animal ID: {'Yes' if use_folder_as_animal_id else 'No'}
            Safety File Used: {'Yes' if safe_file else 'No'}
            Number of Files Collated: {len(csvs)}
            """
            response_data["notes"] = processing_notes.strip()

            return JsonResponse(response_data, status=200)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    def get_user_images(self, request):
        """Get all images for the current user or session with whale information"""
        if request.user.is_authenticated:
            images = UploadedImage.objects.filter(user=request.user)
        else:
            session_key = request.session.session_key
            if not session_key:
                return JsonResponse({"images": []})
            images = UploadedImage.objects.filter(session_key=session_key)
        
        image_data = []
        for img in images:
            image_data.append({
                "id": img.id,
                "filename": img.filename,
                "upload_date": img.upload_date.isoformat(),
                "focal_length_mm": img.focal_length_mm,
                "gps_altitude_m": img.gps_altitude_m,
                "image_width": img.image_width,
                "image_height": img.image_height,
                "camera_make": img.camera_make,
                "camera_model": img.camera_model,
                "measurement_count": img.measurements.count(),
                "whale_name": img.whale_name,  # NEW: Include whale name
                "whale_id": img.whale_id,      # NEW: Include whale ID
            })
        
        return JsonResponse({"images": image_data})

    def get_image_measurements(self, request, image_id=None):
        """Get all measurements for a specific image"""
        # Get image_id from parameter or query string
        if not image_id:
            image_id = request.GET.get('image_id')
        
        if not image_id:
            return JsonResponse({'error': 'image_id parameter required'}, status=400)
            
        logger = logging.getLogger(__name__)  # Add logger definition
        
        try:
            # Get all measurements for this image
            measurements = Measurement.objects.filter(image_id=image_id).order_by('-created_date')
            
            measurements_data = []
            for measurement in measurements:
                # IMPORTANT: Handle JSONField properly - sometimes it's a string, sometimes a dict
                metadata = measurement.measurement_metadata
                if isinstance(metadata, str):
                    try:
                        import json
                        metadata = json.loads(metadata)
                    except json.JSONDecodeError:
                        metadata = {}
                elif metadata is None:
                    metadata = {}
                
                # For ruler_complete measurements, ensure we get the segment count
                if measurement.measurement_type == "ruler_complete":
                    segment_count = metadata.get('segment_count', 0)
                    width_segments = metadata.get('width_segments', [])
                    
                    # If segment_count is missing but we have width_segments, calculate it
                    if segment_count == 0 and width_segments:
                        segment_count = len(width_segments)
                        # Update the metadata to include the correct count
                        metadata['segment_count'] = segment_count
                
                measurement_data = {
                    'id': measurement.id,
                    'measurement_type': measurement.measurement_type,
                    'measurement_name': measurement.measurement_name,
                    'scaled_dimension': float(measurement.scaled_dimension),
                    'coordinate_data': measurement.coordinate_data,
                    'created_date': measurement.created_date.isoformat(),
                    'metadata': metadata,  # This should now be a proper dict
                    'measurement_metadata': metadata  # Also provide it here for backwards compatibility
                }
                
                measurements_data.append(measurement_data)
            
            return JsonResponse({
                'measurements': measurements_data,
                'count': len(measurements_data)
            })
            
        except Exception as e:
            logger.error(f"Error retrieving measurements for image {image_id}: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")  # Add full traceback
            return JsonResponse({'error': 'Failed to retrieve measurements'}, status=500)

    def get(self, request, function_name):
        """Handle GET requests"""
        if function_name == "get_user_images":
            return self.get_user_images(request)
        elif function_name == "get_image_measurements":
            image_id = request.GET.get('image_id')
            if not image_id:
                return JsonResponse({"error": "image_id parameter required"}, status=400)
            return self.get_image_measurements(request, image_id)
        else:
            return JsonResponse({"error": "Invalid function name"}, status=400)

# -------------------------
# Xcertainty Endpoints
# -------------------------
@method_decorator(csrf_exempt, name='dispatch')
class Xcertainty(View):
    """API endpoints for Bayesian photogrammetric analysis using Xcertainty."""

    def post(self, request, function_name):
        """Route requests to the appropriate function."""
        logger = logging.getLogger(__name__)
        logger.info(f"Xcertainty POST: function_name={function_name}")
        
        try:
            if function_name == "parse_observations":
                return self.parse_observations(request)
            elif function_name == "combine_observations":
                return self.combine_observations(request)
            elif function_name in ['independent_length', 'nondecreasing_length', 'growth_curve', 'calibration']:
                return self.run_sampler(request, function_name)
            elif function_name == "extract_summaries":
                return self.extract_summaries(request)
            elif function_name == "calculate_body_condition":
                return self.calculate_body_condition(request)
            else:
                return JsonResponse({"error": "Invalid function name"}, status=400)
        except Exception as e:
            logger.error(f"Xcertainty error: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return JsonResponse({"error": f"Request failed: {str(e)}"}, status=500)
    
    def parse_observations(self, request):
        """Parse wide-format photogrammetric data into structured observations."""
        try:
            data = json.loads(request.body)
            observations = data.get("observations", [])
            
            if not observations:
                return JsonResponse({"error": "No observations provided"}, status=400)
            
            df = pd.DataFrame(observations)
            
            # Import your real parse_observations function
            from MMI_CODEX.xcertainty.parsers.parse_observations import parse_observations
            
            parsed_data = parse_observations(
                x=df, 
                subject_col=data.get("subject_col", "Subject"), 
                meas_col=data.get("meas_col", ["TL"]),  # FIX: Should be a list
                tlen_col=data.get("tlen_col"), 
                image_col=data.get("image_col", "Image"),
                barometer_col=data.get("barometer_col", "Barometer"), 
                laser_col=data.get("laser_col", "Laser"),
                flen_col=data.get("flen_col", "FocalLength"), 
                iwidth_col=data.get("iwidth_col", "ImageWidth"), 
                swidth_col=data.get("swidth_col", "SensorWidth"), 
                uas_col=data.get("uas_col", "UAS"), 
                timepoint_col=data.get("timepoint_col", "Timepoint")
            )
            
            # Convert DataFrames to dicts for JSON serialization
            result = {}
            for key, value in parsed_data.items():
                if value is not None and hasattr(value, 'to_dict'):
                    result[key] = value.to_dict(orient='records')
                else:
                    result[key] = value
            
            return JsonResponse(result, safe=False)
            
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Parse observations error: {str(e)}")
            return JsonResponse({"error": str(e)}, status=400)
    
    def combine_observations(self, request):
        """Combine multiple parsed observation datasets."""
        try:
            data = json.loads(request.body)
            
            from MMI_CODEX.xcertainty.parsers.combine_observations import combine_observations
            
            # Convert datasets back to proper format
            datasets = []
            for dataset in data.get("datasets", []):
                formatted_dataset = {}
                for key, value in dataset.items():
                    if value is not None and isinstance(value, list):
                        formatted_dataset[key] = pd.DataFrame(value)
                    else:
                        formatted_dataset[key] = value
                datasets.append(formatted_dataset)
            
            combined_data = combine_observations(*datasets)
            
            # Convert back to JSON format
            result = {}
            for key, value in combined_data.items():
                if value is not None and hasattr(value, 'to_dict'):
                    result[key] = value.to_dict(orient='records')
                else:
                    result[key] = value
                    
            return JsonResponse(result, safe=False)
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Combine observations error: {str(e)}")
            return JsonResponse({"error": str(e)}, status=400)
    
    def run_sampler(self, request, sampler_type):
        """Run the specified MCMC sampler on parsed data."""
        try:
            data = json.loads(request.body)
            parsed_data = data.get("parsed_data", {})
            priors = data.get("priors", {})
            
            # Convert dict data back to DataFrames
            xcertainty_data = {}
            for key, value in parsed_data.items():
                if value is not None and isinstance(value, list):
                    xcertainty_data[key] = pd.DataFrame(value)
                else:
                    xcertainty_data[key] = value
            
            # Set default priors if not provided
            if not priors:
                priors = self.get_default_priors(xcertainty_data)
            
            # Import and use your real sampler functions
            sampler = None
            if sampler_type == "independent_length":
                from MMI_CODEX.xcertainty.samplers.independent_length_sampler import independent_length_sampler
                sampler = independent_length_sampler(xcertainty_data, priors)
            elif sampler_type == "nondecreasing_length":
                from MMI_CODEX.xcertainty.samplers.nondecreasing_length_sampler import nondecreasing_length_sampler
                sampler = nondecreasing_length_sampler(xcertainty_data, priors)
            elif sampler_type == "growth_curve":
                from MMI_CODEX.xcertainty.samplers.growth_curve_sampler import growth_curve_sampler
                subject_info = pd.DataFrame(data.get("subject_info", [{
                    'Subject': xcertainty_data.get('prediction_objects', pd.DataFrame()).get('Subject', ['Unknown']).iloc[0] if len(xcertainty_data.get('prediction_objects', pd.DataFrame())) > 0 else 'Unknown',
                    'Year': 2024,
                    'Group': 'default',
                    'ObservedAge': 1,
                    'AgeType': 'estimated'
                }]))
                sampler = growth_curve_sampler(xcertainty_data, priors, subject_info)
            elif sampler_type == "calibration":
                from MMI_CODEX.xcertainty.samplers.calibration_sampler import calibration_sampler
                sampler = calibration_sampler(xcertainty_data, priors)
            else:
                return JsonResponse({"error": "Invalid sampler type"}, status=400)
            
            # Run the sampler
            result = sampler(
                niter=data.get("niter", 1000), 
                thin=data.get("thin", 1), 
                summary_burn=data.get("summary_burn", 0.5),
                verbose=data.get("verbose", True)
            )
            
            # Convert results to JSON
            json_result = self.convert_results_to_json(result)
            return JsonResponse(json_result, safe=False)
            
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Run sampler error: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return JsonResponse({"error": str(e)}, status=400)
    
    def extract_summaries(self, request):
        """Extract summaries from Xcertainty MCMC results."""
        try:
            data = json.loads(request.body)
            
            from MMI_CODEX.xcertainty.util.extract_summaries import extract_summaries
            
            summaries = extract_summaries(data["model_output"])
            
            # Convert to JSON format
            if hasattr(summaries, 'to_dict'):
                return JsonResponse(summaries.to_dict(orient="records"), safe=False)
            else:
                return JsonResponse(summaries, safe=False)
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Extract summaries error: {str(e)}")
            return JsonResponse({"error": str(e)}, status=400)
    
    def calculate_body_condition(self, request):
        """Calculate body condition metrics using photogrammetric data."""
        try:
            data = json.loads(request.body)
            
            from MMI_CODEX.xcertainty.util.body_condition import body_condition
            
            # Convert measurements to DataFrame
            measurements_data = data.get("measurements", [])
            if isinstance(measurements_data, list):
                measurements = pd.DataFrame(measurements_data)
            else:
                measurements = measurements_data
                
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
            
            # Convert result to JSON format
            json_result = self.convert_results_to_json(result)
            return JsonResponse(json_result, safe=False)
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Calculate body condition error: {str(e)}")
            return JsonResponse({"error": str(e)}, status=400)

    def get_default_priors(self, data):
        """Generate reasonable default priors based on the data."""
        return {
            'altimeter_bias': pd.DataFrame({
                'Barometer': {'mean': 0, 'sd': 1},
                'Laser': {'mean': 0, 'sd': 1}
            }).T,
            'altimeter_scaling': pd.DataFrame({
                'Barometer': {'mean': 1, 'sd': 0.1},
                'Laser': {'mean': 1, 'sd': 0.1}
            }).T,
            'altimeter_variance': pd.DataFrame({
                'Barometer': {'shape': 2, 'rate': 1},
                'Laser': {'shape': 2, 'rate': 1}
            }).T,
            'image_altitude': [10, 100],
            'pixel_variance': [2, 1],
            'object_lengths': [[5, 20]] * len(data.get('prediction_objects', pd.DataFrame()))
        }

    def convert_results_to_json(self, result):
        """Convert complex result structure to JSON-serializable format."""
        if result is None:
            return None
            
        json_result = {}
        
        if isinstance(result, dict):
            for key, value in result.items():
                json_result[key] = self.convert_results_to_json(value)
        elif hasattr(result, 'to_dict'):
            # Handle pandas DataFrames
            json_result = result.to_dict(orient='records')
        elif isinstance(result, np.ndarray):
            # Handle numpy arrays
            json_result = result.tolist()
        elif isinstance(result, (list, tuple)):
            # Handle lists and tuples
            json_result = [self.convert_results_to_json(item) for item in result]
        elif isinstance(result, (np.integer, np.floating)):
            # Handle numpy scalars
            json_result = result.item()
        else:
            # Handle other types (strings, numbers, etc.)
            json_result = result
            
        return json_result

    def get(self, request, function_name):
        """Handle GET requests for Xcertainty."""
        if function_name == 'list':
            # Return list of available analyses
            try:
                # This would connect to your XcertaintyAnalysis model if you have one
                # For now, return empty list
                return JsonResponse({"analyses": []})
            except Exception as e:
                return JsonResponse({"error": str(e)}, status=500)
        elif function_name == 'details':
            # Return details of a specific analysis
            analysis_id = request.GET.get('id')
            if not analysis_id:
                return JsonResponse({"error": "Analysis ID required"}, status=400)
            # This would fetch from your database
            return JsonResponse({"error": "Analysis storage not implemented"}, status=404)
        else:
            return JsonResponse({"error": f"Invalid GET function name: {function_name}"}, status=400)