from django.shortcuts import render
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import json

def index(request):
    return JsonResponse({"message": "Hello World!"})

# ----------------------
# MorphoMetriX Endpoints
# ----------------------
class MorphoMetriX(View):
    '''
    API Endpoints for photogrammetry measurement tasks using MorphoMetriX.
    '''

    @csrf_exempt
    def measure_length(self, request):
        """
        Measure length from an image.
        Input:
            - image_path: str (Path to the image)
            - points: list of tuples [(x1, y1), (x2, y2)] (Pixel coordinates for measurement)
        Output:
            - length: float (Measured length in pixels)
        """
        pass

    @csrf_exempt
    def measure_width(self, request):
        """
        Measure width from an image.
        Input:
            - image_path: str
            - reference_line: list of tuples [(x1, y1), (x2, y2)]
        Output:
            - width: float (Measured width in pixels)
        """
        pass

    @csrf_exempt
    def measure_angle(self, request):
        """
        Measure an angle between three points.
        Input:
            - image_path: str
            - points: list of tuples [(x1, y1), (x2, y2), (x3, y3)]
        Output:
            - angle: float (Measured angle in degrees)
        """
        pass

    @csrf_exempt
    def measure_area(self, request):
        """
        Measure area based on polygon selection.
        Input:
            - image_path: str
            - polygon: list of tuples [(x1, y1), (x2, y2), ..., (xn, yn)]
        Output:
            - area: float (Measured area in pixels²)
        """
        pass


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
        pass

    @csrf_exempt
    def collate_measurements(self, request):
        """
        Collate measurements from multiple CSV files into a single dataset.
        Input:
            - csv_folder: str (Directory containing multiple CSV files)
        Output:
            - collated_file_path: str (Path to the combined CSV file)
        """
        pass

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
        pass
