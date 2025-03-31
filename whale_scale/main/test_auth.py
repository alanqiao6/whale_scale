from django.test import TestCase, Client
from django.contrib.auth.models import User
import json

class LoginAndAccountTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.test_user = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        self.login_url = '/api/login'
        self.create_account_url = '/api/create-account'

    def test_create_account(self):
        print("\n1. Testing Account Creation:")
        response = self.client.post(
            self.create_account_url,
            data=json.dumps(self.test_user),
            content_type='application/json'
        )
        print(f"Response Status: {response.status_code}")
        print(f"Response Content: {response.content.decode()}")
        
        user_exists = User.objects.filter(username=self.test_user['username']).exists()
        if user_exists:
            print("✅ PASS: Account created successfully")
        else:
            print("❌ FAIL: Account not created in database")

    def test_login(self):
        print("\n2. Testing Login:")
        User.objects.create_user(
            username=self.test_user['username'],
            password=self.test_user['password']
        )
        print("Test user created in database")
        
        response = self.client.post(
            self.login_url,
            data=json.dumps(self.test_user),
            content_type='application/json'
        )
        print(f"Response Status: {response.status_code}")
        print(f"Response Content: {response.content.decode()}")
        
        if response.status_code == 200:
            print("✅ PASS: Login successful")
        else:
            print("❌ FAIL: Login failed")

    def test_invalid_login(self):
        print("\n3. Testing Invalid Login:")
        response = self.client.post(
            self.login_url,
            data=json.dumps({
                'username': 'nonexistent',
                'password': 'wrongpass'
            }),
            content_type='application/json'
        )
        print(f"Response Status: {response.status_code}")
        print(f"Response Content: {response.content.decode()}")
        
        if response.status_code == 400:
            print("✅ PASS: Invalid login correctly rejected")
        else:
            print("❌ FAIL: Invalid login not properly handled")

    def test_duplicate_account(self):
        print("\n4. Testing Duplicate Account Creation:")
        User.objects.create_user(
            username=self.test_user['username'],
            password=self.test_user['password']
        )
        
        response = self.client.post(
            self.create_account_url,
            data=json.dumps(self.test_user),
            content_type='application/json'
        )
        print(f"Response Status: {response.status_code}")
        print(f"Response Content: {response.content.decode()}")
        
        if response.status_code == 400:
            print("✅ PASS: Duplicate account correctly rejected")
        else:
            print("❌ FAIL: Duplicate account not properly handled") 