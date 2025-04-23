import React, { useState, useEffect } from "react";
import AuthModal from './AuthModal';
import HelpModal from './HelpModal';
import "./TopBar.css";

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

const API_BASE_URL = window.location.origin;

export default function TopBar({ activeTab, setActiveTab }) {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [helpMode, setHelpMode] = useState("onboarding");

  useEffect(() => {
    checkAuth();

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
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/api/user/`, {
        credentials: 'include'
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response:', textResponse);
        throw new Error('Server responded with non-JSON content');
      }

      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const csrftoken = getCookie('dev_csrftoken') || getCookie('prod_csrftoken') || getCookie('csrftoken');
      const response = await fetch(`${API_BASE_URL}/accounts/api/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken,
        }
      });

      if (response.ok) {
        setUser(null);
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      } else {
        console.error('Logout failed: Server responded with error');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const tabs = ["measure", "statistics", "data"];

  return (
    <div className="top-bar">
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="right-section">
        <button
          className="tool-button"
          title="Help"
          onClick={() => {
            setShowHelp(true);
            setHelpMode("docs");
          }}
        >
          ❓
        </button>

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
          setUser(userData);
          setShowAuthModal(false);
        }}
      />

      <HelpModal
        isOpen={showHelp}
        onClose={() => {
          setShowHelp(false);
          setHelpMode("docs");
        }}
        mode={helpMode}
        setHelpMode={setHelpMode}
        setShowHelp={setShowHelp}
      />
    </div>
  );
}