"use client"
import "./TopBar.css"
import React, { useState, useEffect } from "react"
import AuthModal from './AuthModal'

export default function TopBar({ activeTab, setActiveTab, activeTool, setActiveTool }) {
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Check if user is logged in on component mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:8000/accounts/api/user/', {
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
      const response = await fetch('http://localhost:8000/accounts/api/logout/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
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