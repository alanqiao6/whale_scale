# whale_scale/accounts/views.py
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
import json

@require_http_methods(["POST"])
@csrf_protect  # Use csrf_protect instead of csrf_exempt
def login_api(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return JsonResponse({
                'id': user.id,
                'username': user.username,
            })
        else:
            return JsonResponse({'error': 'Invalid credentials'}, status=401)
    except Exception as e:
        return JsonResponse({'error': 'Invalid request', 'details': str(e)}, status=400)

@require_http_methods(["POST"])
@csrf_protect  # Use csrf_protect instead of csrf_exempt
def signup_api(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if User.objects.filter(username=username).exists():
            return JsonResponse({'error': 'Username already exists'}, status=400)
        
        user = User.objects.create_user(username=username, password=password)
        login(request, user)
        
        return JsonResponse({
            'id': user.id,
            'username': user.username,
        })
    except Exception as e:
        return JsonResponse({'error': 'Invalid request', 'details': str(e)}, status=400)

@require_http_methods(["POST"])
@csrf_protect  # Use csrf_protect instead of csrf_exempt
def logout_api(request):
    logout(request)
    # Clear the entire session
    request.session.flush()
    # Create response with additional security measures
    response = JsonResponse({'message': 'Logged out successfully'})
    # Delete the session cookie
    response.delete_cookie('sessionid', path='/')
    # Delete the CSRF cookie if it exists
    response.delete_cookie('csrftoken', path='/')
    # Set the response headers to prevent caching
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response

@require_http_methods(["GET"])
@ensure_csrf_cookie  # Add this to set a CSRF cookie
def check_auth(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'id': request.user.id,
            'username': request.username,
        })
    else:
        return JsonResponse({'error': 'Not authenticated'}, status=401)