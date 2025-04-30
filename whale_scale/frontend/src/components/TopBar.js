"use client"

import "./TopBar.css"
import React, { useState, useEffect } from "react"
import AuthModal from './AuthModal'
import HelpModal from './HelpModal'


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

export default function TopBar({ activeTab, setActiveTab, activeTool, setActiveTool, sidebarSubmitted }) {
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showHelp, setShowHelp] = useState(true)
  const [helpMode, setHelpMode] = useState("onboarding")

  // Define high contrast tab styles
  const tabStyle = {
    color: "#000000",
    fontWeight: "bold"
  };

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
    <div className="top-bar" role="navigation" aria-label="Main navigation">
      <div className="tabs" role="tablist">
        <button 
          className={`tab ${activeTab === "measure" ? "active" : ""}`} 
          onClick={() => setActiveTab("measure")}
          role="tab"
          aria-selected={activeTab === "measure"}
          id="measure-tab"
          style={tabStyle}
        >
          Measure
        </button>
        <button
          className={`tab ${activeTab === "xcertainty" ? "active" : ""}`}
          onClick={() => setActiveTab("xcertainty")}
          role="tab"
          aria-selected={activeTab === "xcertainty"}
          id="xcertainty-tab"
          style={tabStyle}
        >
          Xcertainty
        </button>
        <button
          className={`tab ${activeTab === "about" ? "active" : ""}`}
          onClick={() => setActiveTab("about")}
          role="tab"
          aria-selected={activeTab === "about"}
          id="about-tab"
          style={tabStyle}
        >
          About
        </button>
      </div>

      {/* Add the corresponding tabpanels that match the aria-controls values */}
      <div id="measure-content" role="tabpanel" aria-labelledby="measure-tab" style={{display: activeTab === "measure" ? "block" : "none"}}>
        {/* Content for the measure tab */}
      </div>
      
      <div id="xcertainty-content" role="tabpanel" aria-labelledby="xcertainty-tab" style={{display: activeTab === "xcertainty" ? "block" : "none"}}>
        {/* Content for the xcertainty tab */}
      </div>

      <div id="about-content" role="tabpanel" aria-labelledby="about-tab" style={{display: activeTab === "about" ? "block" : "none"}}>
        {/* Content for the about tab */}
      </div>

      <div className="right-section">
        <div className="tools" role="toolbar" aria-label="Measurement tools">
          <button
            className={`tool-button ${activeTool === "ruler" ? "active" : ""}`}
            onClick={() => {
              if (!sidebarSubmitted) {
                alert("📏 You must submit the sidebar first.");
              } else {
                setActiveTool(activeTool === "ruler" ? null : "ruler");
              }
            }}
            title={sidebarSubmitted ? "Measure Length" : "📏 (Must Submit)"}
            disabled={!sidebarSubmitted}
            style={{
              opacity: sidebarSubmitted ? 1 : 0.5,
              cursor: sidebarSubmitted ? "pointer" : "not-allowed",
            }}
            aria-pressed={activeTool === "ruler"}
            aria-label="Ruler tool for measuring length"
          >
            <span aria-hidden="true">📏</span>
          </button>

          <button
            className={`tool-button ${activeTool === "angle" ? "active" : ""}`}
            onClick={() => setActiveTool(activeTool === "angle" ? null : "angle")}
            title="Measure Angle"
            aria-pressed={activeTool === "angle"}
            aria-label="Angle tool for measuring angles"
          >
            <span aria-hidden="true">📐</span>
          </button>
          <button
            className={`tool-button ${activeTool === "pencil" ? "active" : ""}`}
            onClick={() => setActiveTool(activeTool === "pencil" ? null : "pencil")}
            title="Draw"
            aria-pressed={activeTool === "pencil"}
            aria-label="Pencil tool for drawing curves"
          >
            <span aria-hidden="true">✏️</span>
          </button>
          <button
            className={`tool-button ${activeTool === "area" ? "active" : ""}`}
            onClick={() => setActiveTool(activeTool === "area" ? null : "area")}
            title="Measure Area"
            aria-pressed={activeTool === "area"}
            aria-label="Area tool for measuring areas"
          >
            <span aria-hidden="true">🔲</span>
          </button>
          <button 
            className="tool-button" 
            title="Help" 
            onClick={() => {
              setShowHelp(true)
              setHelpMode("docs")
            }}
            aria-label="Help and documentation"
          >
            <span aria-hidden="true">❓</span>
          </button>

        </div>

        <div className="auth-section">
          {user ? (
            <div className="user-info" role="status" aria-live="polite">
              <span className="username">Hi, {user.username}</span>
              <button 
                className="logout-button" 
                onClick={handleLogout}
                aria-label="Log out of your account"
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              className="login-button" 
              onClick={() => setShowAuthModal(true)}
              aria-label="Log in to your account"
            >
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
      <HelpModal
        isOpen={showHelp}
        onClose={() => {
          setShowHelp(false);  // Always close the modal
          setHelpMode("docs"); // Reset mode so it doesn't auto-reopen
        }}
        mode={helpMode}
        setHelpMode={setHelpMode}
        setShowHelp={setShowHelp}
      />



    </div>
  )
}
