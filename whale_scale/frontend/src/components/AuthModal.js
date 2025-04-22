import React, { useState } from 'react'
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

// Use the correct base URL - this should match your Django server
const API_BASE_URL = 'https://dev-whale-scale.colab.duke.edu';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const csrftoken = getCookie('csrftoken');
      const url = isLogin ? '/accounts/api/login/' : '/accounts/api/signup/'
      
      console.log('Making auth request to:', `${API_BASE_URL}${url}`);
      console.log('CSRF Token:', csrftoken); // For debugging
      
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response:', textResponse);
        throw new Error('Server responded with non-JSON content');
      }

      const data = await response.json()

      if (response.ok) {
        onAuthSuccess(data)
        onClose()
      } else {
        setError(data.error || 'An error occurred')
      }
    } catch (err) {
      setError('Failed to connect to server: ' + err.message)
      console.error('Auth error:', err)
    }
  }

  if (!isOpen) return null

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
          >
            {isLogin ? 'Login' : 'Create Account'}
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