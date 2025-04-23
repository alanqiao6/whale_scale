from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
import json
from unittest.mock import patch, MagicMock


class AccountsAPITestCase(TestCase):
    """Base class for accounts API tests with common setup"""
    
    def setUp(self):
        self.client = Client()
        self.test_user = User.objects.create_user(
            username='testuser',
            password='testpassword123'
        )
        self.accounts_url = "/accounts/api/"


class LoginAPITests(AccountsAPITestCase):
    """Tests for the login_api view"""

    def test_login_success(self):
        """Test successful login with valid credentials"""
        data = {
            'username': 'testuser',
            'password': 'testpassword123'
        }
        response = self.client.post(
            f'{self.accounts_url}login/',
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        self.assertEqual(response_data['username'], 'testuser')
        self.assertEqual(response_data['id'], self.test_user.id)

    def test_login_invalid_credentials(self):
        """Test login failure with invalid credentials"""
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        response = self.client.post(
            f'{self.accounts_url}login/',
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 401)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)
        self.assertEqual(response_data['error'], 'Invalid credentials')

    def test_login_missing_fields(self):
        """Test login with missing fields"""
        # Test missing password
        data = {'username': 'testuser'}
        response = self.client.post(
            f'{self.accounts_url}login/',
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)
        
        # Test missing username
        data = {'password': 'testpassword123'}
        response = self.client.post(
            f'{self.accounts_url}login/',
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)

    def test_login_invalid_json(self):
        """Test login with invalid JSON data"""
        response = self.client.post(
            f'{self.accounts_url}login/',
            'not-a-json',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)

    @patch('accounts.views.authenticate')
    def test_login_server_error(self, mock_authenticate):
        """Test login handling of server errors"""
        mock_authenticate.side_effect = Exception("Test server error")
        
        data = {
            'username': 'testuser',
            'password': 'testpassword123'
        }
        response = self.client.post(
            f'{self.accounts_url}login/',
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 500)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)
        self.assertEqual(response_data['error'], 'Server error')


class SignupAPITests(AccountsAPITestCase):
    """Tests for the signup_api view"""

    def test_signup_success(self):
        """Test successful user registration"""
        data = {
            'username': 'newuser',
            'password': 'newpassword123'
        }
        response = self.client.post(
            f'{self.accounts_url}signup/',
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        self.assertEqual(response_data['username'], 'newuser')
        
        # Verify user was created in database
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_signup_existing_username(self):
        """Test signup with an already existing username"""
        data = {
            'username': 'testuser',  # This user already exists from setUp
            'password': 'newpassword123'
        }
        response = self.client.post(
            f'{self.accounts_url}signup/',
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)
        self.assertEqual(response_data['error'], 'Username already exists')

    def test_signup_missing_fields(self):
        """Test signup with missing fields"""
        # Test missing password
        data = {'username': 'newuser'}
        response = self.client.post(
            f'{self.accounts_url}signup/',
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)
        
        # Test missing username
        data = {'password': 'newpassword123'}
        response = self.client.post(
            f'{self.accounts_url}signup/',
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)

    def test_signup_invalid_json(self):
        """Test signup with invalid JSON data"""
        response = self.client.post(
            f'{self.accounts_url}signup/',
            'not-a-json',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)

    @patch('django.contrib.auth.models.User.objects.create_user')
    def test_signup_server_error(self, mock_create_user):
        """Test signup handling of server errors"""
        mock_create_user.side_effect = Exception("Test server error")
        
        data = {
            'username': 'newuser',
            'password': 'newpassword123'
        }
        response = self.client.post(
            f'{self.accounts_url}signup/',
            json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 500)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)
        self.assertEqual(response_data['error'], 'Server error')


class LogoutAPITests(AccountsAPITestCase):
    """Tests for the logout_api view"""

    def test_logout_success(self):
        """Test successful logout"""
        # First login
        self.client.login(username='testuser', password='testpassword123')
        
        # Then logout
        response = self.client.post(f'{self.accounts_url}logout/')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        self.assertEqual(response_data['message'], 'Logged out successfully')
        
        # Check if session is cleared
        self.assertEqual(list(self.client.session.items()), [])

    @patch('accounts.views.logout')
    def test_logout_server_error(self, mock_logout):
        """Test logout handling of server errors"""
        mock_logout.side_effect = Exception("Test server error")
        
        response = self.client.post(f'{self.accounts_url}logout/')
        
        self.assertEqual(response.status_code, 500)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)
        self.assertEqual(response_data['error'], 'Server error')


class CheckAuthTests(AccountsAPITestCase):
    """Tests for the check_auth view"""

    def test_check_auth_authenticated(self):
        """Test auth check when user is authenticated"""
        # Login first
        self.client.login(username='testuser', password='testpassword123')
        
        response = self.client.get(f'{self.accounts_url}user/')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        self.assertEqual(response_data['username'], 'testuser')
        self.assertEqual(response_data['id'], self.test_user.id)

    def test_check_auth_not_authenticated(self):
        """Test auth check when user is not authenticated"""
        # Make sure not logged in
        self.client.logout()
        
        response = self.client.get(f'{self.accounts_url}user/')
        
        self.assertEqual(response.status_code, 401)
        response_data = json.loads(response.content)
        self.assertIn('error', response_data)
        self.assertEqual(response_data['error'], 'Not authenticated')

    @patch('accounts.views.logger.exception')
    def test_check_auth_server_error(self, mock_logger):
        """Test auth check handling of server errors"""
        # Mock the check_auth view function
        with patch('accounts.views.check_auth') as mock_view:
            # Set up the mock to raise an exception
            mock_view.side_effect = Exception("Test server error")
            
            response = self.client.get(f"{self.accounts_url}user/")
            
            self.assertEqual(response.status_code, 500)
            response_data = json.loads(response.content)
            self.assertIn('error', response_data)
            self.assertEqual(response_data['error'], 'Server error')


class GetCSRFTokenTests(AccountsAPITestCase):
    """Tests for the get_csrf_token view"""

    def test_get_csrf_token(self):
        """Test getting CSRF token"""
        response = self.client.get(f'{self.accounts_url}csrf/')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.content)
        self.assertEqual(response_data['detail'], 'CSRF cookie set')
        
        # Check if CSRF cookie was set
        self.assertIn('dev_csrftoken', response.cookies)


class SecurityTests(AccountsAPITestCase):
    """Tests for security aspects of the accounts API"""

    def test_csrf_protection(self):
        """Test that CSRF protection is enforced"""
        # Attempt to login without CSRF token
        client = Client(enforce_csrf_checks=True)
        data = {
            'username': 'testuser',
            'password': 'testpassword123'
        }
        
        response = client.post(
            f'{self.accounts_url}login/',
            json.dumps(data),
            content_type='application/json'
        )
        
        # Should be rejected due to CSRF protection
        self.assertEqual(response.status_code, 403)

    def test_http_methods_constraints(self):
        """Test that only allowed HTTP methods work"""
        # Try GET on login endpoint which should only accept POST
        response = self.client.get(f'{self.accounts_url}login/')
        self.assertEqual(response.status_code, 405)
        
        # Try PUT on login endpoint
        response = self.client.put(
            f'{self.accounts_url}login/',
            json.dumps({'username': 'testuser', 'password': 'testpassword123'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 405)