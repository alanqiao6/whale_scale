from django.test import TestCase
from django.urls import reverse
import json
from pathlib import Path
import shutil
import pandas as pd
import numpy as np

class MorphoMetrixTests(TestCase):
    def test_calculate_curve(self):
        data = {
            "measurement_stack": [{
                "measurement_type": "curve",
                "name": "Test Curve",
                "objects_params": [
                    {"parms": {"x": 0, "y": 0}},
                    {"parms": {"x": 1, "y": 2}},
                    {"parms": {"x": 3, "y": 3}}
                ]
            }]
        }
        response = self.client.post(
            reverse('morphometrix_function', kwargs={'function_name': 'calculate_curve'}),
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('curve_points', data)
        self.assertIn('length', data)

    def test_calculate_length(self):
        data = {
            "measurement": {
                "measurement_type": "line",
                "measurement_name": "Test Line",
                "objects_params": [
                    {"parms": {"length": 10}},
                    {"parms": {"length": 15}}
                ]
            }
        }
        response = self.client.post(
            reverse('morphometrix_function', kwargs={'function_name': 'calculate_length'}),
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['length'], 25)

    def test_calculate_area(self):
        data = {
            "measurement": {
                "measurement_type": 2,
                "name": "Test Area Measurement",
                "objects_params": [{
                    "type": 5,
                    "parms": [
                        {"x": 0, "y": 0},
                        {"x": 4, "y": 0},
                        {"x": 4, "y": 3},
                        {"x": 0, "y": 3}
                    ]
                }]
            }
        }
        response = self.client.post(
            reverse('morphometrix_function', kwargs={'function_name': 'calculate_area'}),
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['area'], 12.0)

    def test_calculate_angle(self):
        data = {
            "measurement": {
                "measurement_type": 3,
                "name": "Test Angle Measurement",
                "objects_params": [
                    {
                        "type": 1,
                        "parms": {"x1": 0, "y1": 0, "x2": 1, "y2": 1}
                    },
                    {
                        "type": 1,
                        "parms": {"x1": 0, "y1": 0, "x2": 1, "y2": -1}
                    }
                ]
            }
        }
        response = self.client.post(
            reverse('morphometrix_function', kwargs={'function_name': 'calculate_angle'}),
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['angle'], 90.0)

class CollatrixTests(TestCase):
    def setUp(self):
        self.test_dir = Path(__file__).parent / "test_data"
        self.test_dir.mkdir(exist_ok=True)

    def tearDown(self):
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)

    def test_calculate_body_condition(self):
        data = {
            "measurements": [{
                "Image_ID": "IMG001",
                "Image": "whale1.png",
                "Length": 15.5,
                "Length_w0.00": 2.5,
                "Length_w5.00": 2.6,
                "Length_w10.00": 2.7,
                "Length_ratio0.00": 0.161,
                "Length_ratio5.00": 0.168,
                "Length_ratio10.00": 0.174
            }],
            "bv_method": "Circle",
            "bai_method": "Trapezoid",
            "tl_name": "Length",
            "interval": 5,
            "lower": 0,
            "upper": 10
        }
        response = self.client.post(
            reverse('collatrix_function', kwargs={'function_name': 'calculate-body-condition'}),
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(isinstance(data, list))
        self.assertEqual(len(data), 1)

    def test_lidar_wrangle(self):
        test_content = "#gmt_date,gmt_time,laser_altitude_cm,tilt_deg\n2025/01/23,12:11:09,120.5,5.5"
        test_file = self.test_dir / "test_lidar.csv"
        test_file.write_text(test_content)

        with open(test_file, 'rb') as f:
            response = self.client.post(
                reverse('collatrix_function', kwargs={'function_name': 'lidar-wrangle'}),
                {
                    'files': [f],
                    'lidar_type': 'LightWare',
                    'gimbal_type': 'fixed'
                },
                format='multipart'
            )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(isinstance(data, list))

    def test_collate_morphometrix(self):
        # Create test CSV files
        data1_content = "Image,Image_Path,Object,Value,Value_unit\nwhale1.png,path/to/image1,Length_w0.00,2.5,Meters"
        data2_content = "Image,Image_Path,Object,Value,Value_unit\nwhale2.png,path/to/image2,Length_w0.00,3.0,Meters"
        safety_content = "Image,Altitude,Focal_Length,Pixel_Dimension\nwhale1.png,100,35,0.005\nwhale2.png,120,40,0.006"

        data1_file = self.test_dir / "data1.csv"
        data2_file = self.test_dir / "data2.csv"
        safety_file = self.test_dir / "safety.csv"

        data1_file.write_text(data1_content)
        data2_file.write_text(data2_content)
        safety_file.write_text(safety_content)

        with open(data1_file, 'rb') as f1, open(data2_file, 'rb') as f2, open(safety_file, 'rb') as f3:
            response = self.client.post(
                reverse('collatrix_function', kwargs={'function_name': 'collate-morphometrix'}),
                {
                    'csv_files': [f1, f2],
                    'safe_file_path': f3,
                    'prefix': 'output',
                    'use_folder_as_animal_id': 'false',
                    'output_option': 'Both in one file'
                },
                format='multipart'
            )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('combined', data)
        self.assertIn('notes', data)
