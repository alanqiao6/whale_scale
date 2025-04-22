"use client"

import "./TopBar.css"
import React, { useState, useEffect } from "react"
import AuthModal from './AuthModal'

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

export default function TopBar({ activeTab, setActiveTab, activeTool, setActiveTool }) {
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    checkAuth()
    
    // Add this function to fetch CSRF token when component mounts
    const fetchCsrfToken = async () => {
      try {
        await fetch(`${API_BASE_URL}/accounts/api/csrf/`, {
          method: 'GET',
          credentials: 'include',
        });
        console.log('CSRF token cookie requested in TopBar');
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
      }
    };
    
    fetchCsrfToken();
  }, [])

  const checkAuth = async () => {
    try {
      console.log('Checking auth status at:', `${API_BASE_URL}/accounts/api/user/`);
      const response = await fetch(`${API_BASE_URL}/accounts/api/user/`, {
        credentials: 'include'
      })
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response:', textResponse);
        throw new Error('Server responded with non-JSON content');
      }
      
      if (response.ok) {
        const data = await response.json()
        setUser(data)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    }
  }

  const handleLogout = async () => {
    try {
      // Try both possible cookie names (dev and standard)
      const csrftoken = getCookie('dev_csrftoken') || getCookie('prod_csrftoken') || getCookie('csrftoken');
      console.log('Logging out at:', `${API_BASE_URL}/accounts/api/logout/`);
      console.log('CSRF Token:', csrftoken); // For debugging
      
      const response = await fetch(`${API_BASE_URL}/accounts/api/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        }
      })
      
      if (response.ok) {
        setUser(null)
        localStorage.clear()
        sessionStorage.clear()
        window.location.reload()
      } else {
        console.error('Logout failed: Server responded with error')
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="top-bar">
      {/* Rest of your component remains the same */}
      <div className="tabs">
        <button className={`tab ${activeTab === "measure" ? "active" : ""}`} onClick={() => setActiveTab("measure")}>
          Measure
        </button>
        <button
          className={`tab ${activeTab === "xcertainty" ? "active" : ""}`}
          onClick={() => setActiveTab("xcertainty")}
        >
          Xcertainty
        </button>
      </div>

      <div className="right-section">
        <div className="tools">
          <button
            className={`tool-button ${activeTool === "ruler" ? "active" : ""}`}
            onClick={() => setActiveTool(activeTool === "ruler" ? null : "ruler")}
            title="Measure Length"
          >
            📏
          </button>
          <button
            className={`tool-button ${activeTool === "angle" ? "active" : ""}`}
            onClick={() => setActiveTool(activeTool === "angle" ? null : "angle")}
            title="Measure Angle"
          >
            📐
          </button>
          <button className="tool-button" title="Comment">🗨️</button>
          <button
            className={`tool-button ${activeTool === "pencil" ? "active" : ""}`}
            onClick={() => setActiveTool(activeTool === "pencil" ? null : "pencil")}
            title="Draw"
          >
            ✏️
          </button>
          <button
            className={`tool-button ${activeTool === "area" ? "active" : ""}`}
            onClick={() => setActiveTool(activeTool === "area" ? null : "area")}
            title="Measure Area"
          >
            🔲
          </button>
          <button className="tool-button" title="Help">❓</button>
        </div>

        <div className="auth-section">
          {user ? (
            <div className="user-info">
              <span className="username">Hi, {user.username}</span>
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <button className="login-button" onClick={() => setShowAuthModal(true)}>
              Login
            </button>
          )}
        </div>
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(userData) => {
          setUser(userData)
          setShowAuthModal(false)
        }}
      />
    </div>
  )
}