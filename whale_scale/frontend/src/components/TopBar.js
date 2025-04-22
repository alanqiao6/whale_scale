"use client"
import "./TopBar.css"
import React from "react"

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

// Get API base URL from environment or default to localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function TopBar({ activeTab, setActiveTab, activeTool, setActiveTool }) {
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Check if user is logged in on component mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/api/user/`, {
        credentials: 'include'
      })
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
      const csrftoken = getCookie('csrftoken');
      
      const response = await fetch(`${API_BASE_URL}/accounts/api/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        }
      })
      
      if (response.ok) {
        // Clear user state immediately
        setUser(null)
        // Clear any frontend storage
        localStorage.clear()
        sessionStorage.clear()
        // Force a page reload to fully clear any cached data
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
        <button className="tool-button" title="Comment">
          🗨️
        </button>
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
        <button className="tool-button" title="Help">
          ❓
        </button>
      </div>
    </div>
  )
}

