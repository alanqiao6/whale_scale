import React, { useState } from 'react'
import './AuthModal.css'

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const url = isLogin ? '/accounts/api/login/' : '/accounts/api/signup/'
      const response = await fetch(`http://localhost:8000${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (response.ok) {
        onAuthSuccess(data)
        onClose()
      } else {
        setError(data.error || 'An error occurred')
      }
    } catch (err) {
      setError('Failed to connect to server')
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