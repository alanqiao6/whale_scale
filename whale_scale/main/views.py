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

if platform.system() == "Windows":
    exiftool_path = (current_dir / ".." / "MMI_CODEX" / "collatrix" / "exiftool.exe").resolve()
else:
    exiftool_path = "exiftool"


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
            }]
        }).then(response => console.log(response.data));

        """
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
        """
        Compute total length of selected measurement.

        Input: JSON with a measurement containing objects_params of line segments, each with a length in parms.

        Output: JSON with the total length.

        Axios Example:
        axios.post("http://localhost:8000/morphometrix/calculate_length/", {
            measurement: {
                measurement_type: "line",
                measurement_name: "Test Line",
                objects_params: [
                { parms: { length: 10 } },
                { parms: { length: 15 } }
                ]
            }
        }).then(response => console.log(response.data));
        """
        data = json.loads(request.body)
        logger = logging.getLogger(__name__)
        logger.info("Received measurement: %s", data)
        measurement_data = data.get("measurement", {})
        measurement = Measurement(
            measurement_type=measurement_data.get("measurement_type"),
            name=measurement_data.get("measurement_name")
        )
        measurement.objects_params = measurement_data.get("objects_params", [])

        measurement.measurement_value = sum([obj["parms"].get("length", 0) for obj in measurement.objects_params])
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
            }
        }).then(response => console.log(response.data));
        """
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
        # Check if exiftool_path is defined and exists, otherwise use default
        if 'exiftool_path' not in globals() or not os.path.exists(exiftool_path):
            exiftool_executable = "/usr/bin/exiftool"  # Standard path for Debian-based systems
        else:
            exiftool_executable = str(exiftool_path)
        self.exiftool = ExifToolHelper(executable=str(exiftool_path))

    def post(self, request, function_name):
        """
        Routes requests to the appropriate function based on the URL path.
        """
        if function_name == "calculate_body_condition":
            return self.calculate_body_condition(request)
        elif function_name == "lidar_wrangle":
            return self.lidar_wrangle(request)
        elif function_name == "lidar_image":
            return self.lidar_image(request)
        elif function_name == "collate_morphometrix":
            return self.collate_morphometrix(request)
        elif function_name == "extract_metadata":
            return self.extract_metadata(request)
        else:
            return JsonResponse({"error": "Invalid function name"}, status=400)

    def extract_metadata(self, request):
        """
        Extracts metadata from an uploaded image.

        Input: multipart/form-data with a single image file.

        Output: JSON object containing metadata such as timestamp, camera model, GPS coordinates, and exposure settings.

        Axios Example:
        const formData = new FormData();
        formData.append("image", imageFile);

        axios.post("http://localhost:8000/collatrix/extract_metadata/", formData)
        .then(response => console.log(response.data));
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
                "file_name": metadata.get("File:FileName", os.path.basename(image_path)),
                "file_size_bytes": metadata.get("File:FileSize", None),
                "image_dimensions": f"{metadata.get('File:ImageWidth', '?')} x {metadata.get('File:ImageHeight', '?')}",
                "megapixels": metadata.get("Composite:Megapixels", None),
                "camera_make": metadata.get("EXIF:Make", "Unknown"),
                "camera_model": metadata.get("EXIF:Model", "Unknown"),
                "lens_info": metadata.get("EXIF:LensInfo", "Unknown"),
                "serial_number": metadata.get("EXIF:SerialNumber", "Unknown"),
                "shutter_speed_sec": metadata.get("EXIF:ShutterSpeedValue", None),
                "aperture_f_number": metadata.get("EXIF:ApertureValue", None),
                "iso": metadata.get("EXIF:ISO", None),
                "focal_length_mm": metadata.get("EXIF:FocalLength", None),
                "focal_length_35mm_equiv": metadata.get("EXIF:FocalLengthIn35mmFormat", None),
                "exposure_compensation": metadata.get("EXIF:ExposureCompensation", None),
                "white_balance": "Auto" if metadata.get("EXIF:WhiteBalance") == 0 else "Manual",
                "digital_zoom_ratio": metadata.get("EXIF:DigitalZoomRatio", None),
                "gps_latitude": metadata.get("Composite:GPSLatitude", None),
                "gps_longitude": metadata.get("Composite:GPSLongitude", None),
                "gps_altitude_m": metadata.get("Composite:GPSAltitude", None),
                "gimbal_pitch_deg": metadata.get("XMP:GimbalPitchDegree", None),
                "gimbal_yaw_deg": metadata.get("XMP:GimbalYawDegree", None),
                "gimbal_roll_deg": metadata.get("XMP:GimbalRollDegree", None),
                "drone_pitch_deg": metadata.get("XMP:FlightPitchDegree", None),
                "drone_yaw_deg": metadata.get("XMP:FlightYawDegree", None),
                "drone_roll_deg": metadata.get("XMP:FlightRollDegree", None),
                "sensor_temperature_c": metadata.get("XMP:SensorTemperature", None),
                "sensor_fps": metadata.get("XMP:SensorFPS", None),
                "field_of_view_deg": metadata.get("Composite:FOV", None),
                "hyperfocal_distance_m": metadata.get("Composite:HyperfocalDistance", None),
                "light_value_ev": metadata.get("Composite:LightValue", None),
            }

            return JsonResponse(response_data)

        except Exception as e:
            traceback.print_exc()
            return JsonResponse({"error": str(e)}, status=500)

        finally:
            os.remove(image_path)

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

    def lidar_video(self, request):
        """
        Extract metadata from videos and match with LiDAR data.
        """
        files = request.FILES.getlist('video_files')
        gps_data = json.loads(request.body).get("gps_data")
        lidar_data = json.loads(request.body).get("lidar_data")
        time_window = float(json.loads(request.body).get("time_window", 5))

        if not files or not gps_data or not lidar_data:
            return JsonResponse({"error": "Video files, GPS data, and LiDAR data are required"}, status=400)

        video_paths = [default_storage.save(file.name, file) for file in files]

        try:
            et = self.exiftool
            df_video = self._wrangle_video_metadata(video_paths, et)
            df_gps = pd.DataFrame(gps_data)
            df_lidar = pd.DataFrame(lidar_data)

            # Merge GPS and video data
            df_gps['GPS_DT'] = pd.to_datetime(df_gps['GPS_DT'])
            df_video['START'] = pd.to_datetime(df_video['START'])

            # Merge to assign offset
            df_vid_x = df_video.merge(
                df_gps[['FlightID', 'GPS_DT']],
                on='FlightID',
                how='left'
            )

            # Calculate offset
            df_vid_x['offset'] = df_vid_x['GPS_DT'] - df_vid_x['START']

            # Correct time by adding offset
            df_vid_x['CorrStart'] = df_vid_x['START'] + df_vid_x['offset']
            df_vid_x['CorrEnd'] = df_vid_x['MT.DT'] + df_vid_x['offset']

            # Handle missing flights
            missing_flights = df_vid_x[df_vid_x['CorrStart'].isna()]['FlightID'].tolist()
            if missing_flights:
                message = f"These flights were skipped because they were not in the GPS time csv: {missing_flights}"
                print(message)

            # Filter out invalid rows
            df_vid_x = df_vid_x.dropna(subset=['CorrStart'])

            # Explode dataframe to one row per second
            df_vid_x['CorrDT'] = df_vid_x.apply(
                lambda row: pd.date_range(start=row['CorrStart'], end=row['CorrEnd'], freq="S"),
                axis=1
            )
            df_exploded = df_vid_x.explode('CorrDT')

            # Compute video time relative to the start
            df_exploded['VideoTime'] = df_exploded['CorrDT'] - df_exploded['CorrStart']

            # Merge with LiDAR data using time window
            df_lidar['CorrDT'] = pd.to_datetime(df_lidar['CorrDT'])

            if time_window > 0:
                # Sort values for merge_asof
                df_exploded = df_exploded.sort_values('CorrDT')
                df_lidar = df_lidar.sort_values('CorrDT')

                df_lidarmerge = pd.merge_asof(
                    df_exploded,
                    df_lidar[['CorrDT', 'Laser_Alt']],
                    on="CorrDT",
                    tolerance=pd.Timedelta(seconds=time_window),
                    direction="nearest"
                )
            else:
                df_lidarmerge = df_exploded.merge(
                    df_lidar[['CorrDT', 'Laser_Alt']],
                    how='left',
                    on='CorrDT'
                )

            # Clean up final output
            result = df_lidarmerge[['VideoID', 'FlightID', 'VideoTime', 'Laser_Alt']].dropna()

            return JsonResponse(result.to_dict(orient="records"), safe=False)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

        finally:
            for path in video_paths:
                os.remove(path)

    def _wrangle_video_metadata(self, video_paths, et):
        """
        Internal method for extracting video metadata using ExifTool.
        """
        df_video = pd.DataFrame()
        tagnames = []

        # Extract metadata using ExifTool
        for d in et.get_metadata(video_paths):
            tempdict = {k: v for k, v in d.items()}
            tagnames.extend(tempdict.keys())
            tempdf = pd.DataFrame(data=tempdict, index=[0])
            df_video = pd.concat([df_video, tempdf]).reset_index(drop=True)

        # Clean up dataframe
        tagnames = list(set(tagnames))

        name_tag = next((x for x in tagnames if 'File:FileName' in x), None)
        duration_tag = next((x for x in tagnames if 'TrackDuration' in x or 'Duration' in x), None)
        date_tag = next((x for x in tagnames if 'CreateDate' in x or 'ModifyDate' in x), None)

        if not name_tag or not duration_tag or not date_tag:
            raise ValueError("Required EXIF tags not found in video metadata.")

        df_video = df_video.rename(columns={
            name_tag: 'MOV',
            duration_tag: 'DUR_S',
            date_tag: 'MT'
        })

        # Clean up data
        df_video['VideoID'] = df_video['MOV'].str.replace('.MOV', '')

        # Convert duration to timedelta
        df_video['DUR.TD'] = pd.to_timedelta(df_video['DUR_S'], unit='s')

        # Convert modify time to datetime
        df_video['MT.DT'] = pd.to_datetime(df_video['MT'], format="%Y:%m:%d %H:%M:%S", errors="coerce")

        # Calculate video start time
        df_video['START'] = df_video['MT.DT'] - df_video['DUR.TD']

        # Handle flight ID parsing
        flight_ixs = json.loads(self.request.body).get("flight_ixs", [])
        delimiter = json.loads(self.request.body).get("delimiter", "_")

        if flight_ixs:
            df_video['FlightID'] = [
                delimiter.join(x.split(delimiter)[i] for i in flight_ixs)
                for x in df_video['MOV']
            ]

        return df_video

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

    def lidar_match(self, request):
        """
        Match image data with LiDAR data using timestamps and video IDs.
        """
        data = json.loads(request.body)
        image_data = data.get("images", [])
        lidar_data = data.get("lidar", [])
        time_window = float(data.get("time_window", 5))
        delimiter = data.get("delimiter", "_")
        video_ixs = data.get("video_ixs", [])

        if not image_data or not lidar_data:
            return JsonResponse({"error": "Image and LiDAR data are required"}, status=400)

        try:
            # Load data into dataframes
            df_images = pd.DataFrame(image_data)
            df_lidar = pd.DataFrame(lidar_data)

            # Step 1: Extract time from image names if not already provided
            if "VideoTime" not in df_images:
                df_images["VideoTime"] = df_images["Image"].apply(
                    lambda x: extract_time_from_filename(x, delimiter, video_ixs)
                )

            df_images["VideoTime"] = pd.to_datetime(df_images["VideoTime"], format="%H:%M:%S").dt.time

            # Step 2: Generate VideoID from file names if missing
            if "VideoID" not in df_images:
                df_images["VideoID"] = df_images["Image"].apply(
                    lambda x: generate_video_id(x, delimiter, video_ixs)
                )

            # Step 3: Process LiDAR data
            df_lidar["VideoTime"] = pd.to_datetime(
                df_lidar["VideoTime"], format="%H:%M:%S", errors="coerce"
            ).dt.time

            df_lidar = df_lidar.dropna(subset=["Laser_Alt"])  # Remove invalid LiDAR data

            if time_window > 0:
                # Convert time to seconds for merge_asof
                df_images["ImgTime_s"] = df_images["VideoTime"].apply(
                    lambda t: t.hour * 3600 + t.minute * 60 + t.second
                )
                df_lidar["LidarTime_s"] = df_lidar["VideoTime"].apply(
                    lambda t: t.hour * 3600 + t.minute * 60 + t.second
                )

                # Create timestamp for merge_asof
                df_images["MergeTime"] = pd.to_datetime(df_images["VideoTime"], format="%H:%M:%S")
                df_lidar["MergeTime"] = pd.to_datetime(df_lidar["VideoTime"], format="%H:%M:%S")

                # Sort for merge_asof
                df_images = df_images.sort_values(by="MergeTime")
                df_lidar = df_lidar.sort_values(by="MergeTime")

                # Merge with time window tolerance
                df_lidarmerge = pd.merge_asof(
                    df_images,
                    df_lidar[["VideoID", "VideoTime", "LidarTime_s", "MergeTime", "Laser_Alt"]],
                    on="MergeTime",
                    by="VideoID",
                    tolerance=pd.Timedelta(seconds=time_window),
                    direction="nearest",
                    suffixes=("_image", "_lidar")
                )

                # Calculate time difference in seconds
                df_lidarmerge["timediff_sec"] = (
                    df_lidarmerge["ImgTime_s"] - df_lidarmerge["LidarTime_s"]
                )

                df_lidarmerge = df_lidarmerge.drop(
                    columns=["ImgTime_s", "LidarTime_s", "MergeTime"]
                )
            else:
                # Direct merge without time tolerance
                df_lidarmerge = df_images.merge(
                    df_lidar[["VideoID", "VideoTime", "Laser_Alt"]],
                    how="left",
                    on=["VideoID", "VideoTime"]
                )

            # Clean final output
            result = df_lidarmerge[["Image", "VideoID", "VideoTime", "Laser_Alt"]].dropna()

            return JsonResponse(result.to_dict(orient="records"), safe=False)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

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