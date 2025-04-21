# whale_scale/accounts/views.py
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import json

@require_http_methods(["POST"])
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
    except:
        return JsonResponse({'error': 'Invalid request'}, status=400)

@require_http_methods(["POST"])
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
    except:
        return JsonResponse({'error': 'Invalid request'}, status=400)

@require_http_methods(["POST"])
def logout_api(request):
    logout(request)
    request.session.flush()
    response = JsonResponse({'message': 'Logged out successfully'})
    response.delete_cookie('sessionid', path='/')
    response.delete_cookie('csrftoken', path='/')
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    return response

@require_http_methods(["GET"])
def check_auth(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'id': request.user.id,
            'username': request.user.username,
        })
    else:
        return JsonResponse({'error': 'Not authenticated'}, status=401)

@require_http_methods(["GET"])
@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'message': 'CSRF cookie set'})