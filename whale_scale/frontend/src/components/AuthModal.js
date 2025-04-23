import React, { useState, useEffect } from 'react'
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

// Use window.location.origin to determine the base URL dynamically
const API_BASE_URL = window.location.origin;

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

  // Trap focus within the modal when it's open
  useEffect(() => {
    if (!isOpen) return;

    // Handle Escape key to close modal
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const csrftoken = getCookie('dev_csrftoken') || getCookie('prod_csrftoken') || getCookie('csrftoken');  // Try all possible cookie names
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

  // Style definitions with enhanced contrast
  const styles = {
    modalTitle: {
      color: '#222222',
      fontSize: '1.5rem',
      fontWeight: 'bold',
      marginBottom: '20px'
    },
    label: {
      color: '#333333',
      fontWeight: 'bold',
      display: 'block',
      marginBottom: '5px'
    },
    input: {
      border: '1px solid #666666',
      padding: '8px 12px',
      borderRadius: '4px',
      width: '100%'
    },
    submitButton: {
      background: '#0056b3',
      color: 'white',
      border: 'none',
      padding: '10px 16px',
      borderRadius: '4px',
      fontWeight: 'bold',
      cursor: 'pointer',
      width: '100%',
      marginTop: '15px'
    },
    disabledButton: {
      background: '#6c757d',
      color: 'white',
      border: 'none',
      padding: '10px 16px',
      borderRadius: '4px',
      fontWeight: 'bold',
      width: '100%',
      marginTop: '15px',
      cursor: 'not-allowed'
    },
    switchText: {
      color: '#333333',
      textAlign: 'center',
      marginTop: '10px'
    },
    switchButton: {
      background: 'none',
      border: 'none',
      color: '#0056b3',
      fontWeight: 'bold',
      cursor: 'pointer',
      padding: '0',
      margin: '0'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#333333',
      fontSize: '1.5rem',
      fontWeight: 'bold',
      position: 'absolute',
      top: '10px',
      right: '10px',
      cursor: 'pointer'
    },
    errorMessage: {
      background: '#fff8f8',
      color: '#d32f2f',
      border: '1px solid #ffcdd2',
      borderRadius: '4px',
      padding: '10px',
      marginBottom: '20px'
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="auth-modal-overlay" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="auth-modal-title"
    >
      <div className="auth-modal-content">
        <button 
          onClick={onClose}
          className="auth-modal-close"
          aria-label="Close authentication dialog"
          style={styles.closeButton}
        >
          <span aria-hidden="true">✕</span>
        </button>
        
        <h2 className="auth-modal-title" id="auth-modal-title" style={styles.modalTitle}>
          {isLogin ? 'Login' : 'Create Account'}
        </h2>
        
        {error && (
          <div className="auth-modal-error" role="alert" aria-live="assertive" style={styles.errorMessage}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-modal-form">
          <div className="auth-modal-field">
            <label className="auth-modal-label" htmlFor="auth-username" style={styles.label}>
              Username
            </label>
            <input
              type="text"
              id="auth-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-modal-input"
              required
              aria-required="true"
              autoComplete={isLogin ? "username" : "new-username"}
              style={styles.input}
            />
          </div>
          
          <div className="auth-modal-field">
            <label className="auth-modal-label" htmlFor="auth-password" style={styles.label}>
              Password
            </label>
            <input
              type="password"
              id="auth-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-modal-input"
              required
              aria-required="true"
              autoComplete={isLogin ? "current-password" : "new-password"}
              style={styles.input}
            />
          </div>
          
          <button
            type="submit"
            className="auth-modal-submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            style={isSubmitting ? styles.disabledButton : styles.submitButton}
          >
            {isSubmitting ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>
        
        <p className="auth-modal-switch" style={styles.switchText}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="auth-modal-switch-btn"
            type="button"
            style={styles.switchButton}
          >
            {isLogin ? 'Sign up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default AuthModal