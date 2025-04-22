from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
import json
import logging

# Set up logging
logger = logging.getLogger(__name__)

@require_http_methods(["POST"])
@csrf_protect
def login_api(request):
    try:
        # Debug: Log the incoming request
        logger.debug(f"Login request body: {request.body}")
        
        # Try to parse JSON data
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)
        
        # Extract credentials
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            logger.warning("Missing username or password")
            return JsonResponse({'error': 'Username and password are required'}, status=400)
        
        # Authenticate user
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            logger.info(f"User {username} logged in successfully")
            return JsonResponse({
                'id': user.id,
                'username': user.username,
            })
        else:
            logger.warning(f"Failed login attempt for username: {username}")
            return JsonResponse({'error': 'Invalid credentials'}, status=401)
    except Exception as e:
        logger.exception(f"Login error: {str(e)}")
        return JsonResponse({'error': 'Server error', 'details': str(e)}, status=500)

@require_http_methods(["POST"])
@csrf_protect
def signup_api(request):
    try:
        # Debug: Log the incoming request
        logger.debug(f"Signup request body: {request.body}")
        
        # Try to parse JSON data
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)
        
        # Extract credentials
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            logger.warning("Missing username or password")
            return JsonResponse({'error': 'Username and password are required'}, status=400)
        
        if User.objects.filter(username=username).exists():
            logger.warning(f"Username {username} already exists")
            return JsonResponse({'error': 'Username already exists'}, status=400)
        
        # Create user
        user = User.objects.create_user(username=username, password=password)
        login(request, user)
        
        logger.info(f"User {username} created successfully")
        return JsonResponse({
            'id': user.id,
            'username': user.username,
        })
    except Exception as e:
        logger.exception(f"Signup error: {str(e)}")
        return JsonResponse({'error': 'Server error', 'details': str(e)}, status=500)

@require_http_methods(["POST"])
@csrf_protect
def logout_api(request):
    try:
        # Debug: Log the logout request
        logger.debug("Logout request received")
        
        logout(request)
        # Clear the entire session
        request.session.flush()
        
        # Create response with additional security measures
        response = JsonResponse({'message': 'Logged out successfully'})
        # Delete the session cookie
        response.delete_cookie('sessionid', path='/')
        # Set the response headers to prevent caching
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        
        logger.info("User logged out successfully")
        return response
    except Exception as e:
        logger.exception(f"Logout error: {str(e)}")
        return JsonResponse({'error': 'Server error', 'details': str(e)}, status=500)

@require_http_methods(["GET"])
@ensure_csrf_cookie
def check_auth(request):
    try:
        # Debug: Log the auth check request
        logger.debug("Auth check request received")
        
        if request.user.is_authenticated:
            logger.info(f"Auth check: User {request.user.username} is authenticated")
            return JsonResponse({
                'id': request.user.id,
                'username': request.user.username,
            })
        else:
            logger.debug("Auth check: No authenticated user")
            return JsonResponse({'error': 'Not authenticated'}, status=401)
    except Exception as e:
        logger.exception(f"Auth check error: {str(e)}")
        return JsonResponse({'error': 'Server error', 'details': str(e)}, status=500)
    
@require_http_methods(["GET"])
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Simple view that returns a 200 OK response and sets the CSRF cookie.
    This endpoint should be called before any POST request that requires CSRF protection.
    """
    return JsonResponse({"detail": "CSRF cookie set"})