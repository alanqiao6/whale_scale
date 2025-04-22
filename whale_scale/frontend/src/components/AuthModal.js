import React, { useState, useEffect } from 'react'  // Add useEffect import
import './AuthModal.css'

// Utility function to get CSRF token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Use the correct base URL
const API_BASE_URL = 'https://dev-whale-scale.colab.duke.edu';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Add this new fetchCsrfToken function
  const fetchCsrfToken = async () => {
    try {
      await fetch(`${API_BASE_URL}/accounts/api/csrf/`, {
        method: 'GET',
        credentials: 'include',
      });
      console.log('CSRF token cookie requested');
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
    }
  };
  
  // Add this useEffect hook to fetch CSRF token when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCsrfToken();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const csrftoken = getCookie('dev_csrftoken') || getCookie('csrftoken');  // Try both cookie names
      const url = isLogin ? '/accounts/api/login/' : '/accounts/api/signup/'
      
      console.log('Making auth request to:', `${API_BASE_URL}${url}`);
      console.log('CSRF Token:', csrftoken);
      
      // Log the request payload for debugging
      const payload = { username, password };
      console.log('Request payload:', JSON.stringify(payload));
      
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries([...response.headers]));

      // Try to parse response as JSON
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        console.log('Response data:', data);
      } else {
        const textResponse = await response.text();
        console.error('Non-JSON response:', textResponse);
        throw new Error(`Server responded with non-JSON content (${response.status})`);
      }

      if (response.ok) {
        onAuthSuccess(data);
        onClose();
      } else {
        setError(data.error || `Request failed with status ${response.status}`);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(`Failed to connect to server: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-content">
        <button 
          onClick={onClose}
          className="auth-modal-close"
        >
          ✕
        </button>
        
        <h2 className="auth-modal-title">
          {isLogin ? 'Login' : 'Create Account'}
        </h2>
        
        {error && (
          <div className="auth-modal-error">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-modal-form">
          <div className="auth-modal-field">
            <label className="auth-modal-label">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-modal-input"
              required
            />
          </div>
          
          <div className="auth-modal-field">
            <label className="auth-modal-label">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-modal-input"
              required
            />
          </div>
          
          <button
            type="submit"
            className="auth-modal-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>
        
        <p className="auth-modal-switch">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="auth-modal-switch-btn"
          >
            {isLogin ? 'Sign up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default AuthModal