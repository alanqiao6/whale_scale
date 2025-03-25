import React, { useState } from 'react';
import axios from 'axios';
import Login from './Login'; // Import the Login component
import './TopBar.css';

export default function TopBar({ activeTab, setActiveTab }) {
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  return (
    <div className="top-bar">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'measure' ? 'active' : ''}`}
          onClick={() => setActiveTab('measure')}
        >
          Measure
        </button>
        <button
          className={`tab ${activeTab === 'xcertainty' ? 'active' : ''}`}
          onClick={() => setActiveTab('xcertainty')}
        >
          Xcertainty
        </button>
      </div>
      <div className="tools">
        <button className="tool-button">🗨️</button>
        <button className="tool-button">✏️</button>
        <button className="tool-button">📏</button>
        <button className="tool-button">❓</button>
        
        {/* Display username if logged in */}
        {isLoggedIn ? (
          <div className="user-info">{username}</div>
        ) : (
          <button className="tool-button" onClick={() => setShowLogin(true)}>
            Login
          </button>
        )}
      </div>

      {/* Login Popup */}
      {showLogin && (
        <Login 
          setIsLoggedIn={setIsLoggedIn}
          setShowLogin={setShowLogin}
          setUsername={setUsername}
        />
      )}
    </div>
  );
}