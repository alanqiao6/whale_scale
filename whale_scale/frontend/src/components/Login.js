import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ setIsLoggedIn, setShowLogin, setUsername, isLoggedIn, currentUsername }) {
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // If already logged in, show user menu
  if (isLoggedIn) {
    return (
      <div className="login-popup">
        <div className="login-popup-content">
          <h2>User Menu</h2>
          <p>Welcome, {currentUsername}!</p>
          <button onClick={async () => {
            try {
              const response = await axios.post(
                'http://localhost:8000/api/logout',
                {},  // empty body
                {
                  withCredentials: true,
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                  }
                }
              );
              
              if (response.data.message === "Logged out successfully") {
                setIsLoggedIn(false);
                setUsername('');
                setShowLogin(false);
                localStorage.removeItem('username'); // Remove login data from storage
              }
            } catch (error) {
              console.error('Logout failed:', error);
            }
          }}>Logout</button>
          <button onClick={() => setShowLogin(false)}>Close</button>
        </div>
      </div>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('http://localhost:8000/api/login', { 
        username: usernameInput, 
        password 
      });
      
      if (response.data.message === "Login successful") {
        setIsLoggedIn(true);
        setUsername(response.data.username);
        setShowLogin(false);
        localStorage.setItem('username', response.data.username); // Store login data
      } else {
        setErrorMessage('Error: Invalid username or password');
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || 'Error: Something went wrong, please try again later.');
      console.error(error);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('http://localhost:8000/api/create-account', { 
        username: usernameInput, 
        password 
      });
      
      if (response.data.message === "Account created and login successful") {
        setIsLoggedIn(true);
        setUsername(response.data.username);
        setShowLogin(false);
        localStorage.setItem('username', response.data.username);
      } else {
        setErrorMessage('Error: Could not create account');
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.detail || 'Error: Could not create account');
      console.error(error);
    }
  };

  return (
    <div className="login-popup">
      <div className="login-popup-content">
        <h2>{isCreatingAccount ? "Create Account" : "Login"}</h2>
        <form onSubmit={isCreatingAccount ? handleCreateAccount : handleLogin}>
          <label>
            Username:
            <input
              type="text"
              name="username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              required
            />
          </label>
          <label>
            Password:
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit">{isCreatingAccount ? "Create Account" : "Login"}</button>
        </form>
        <div>
          {isCreatingAccount ? (
            <p>Already have an account? <button onClick={() => setIsCreatingAccount(false)}>Login</button></p>
          ) : (
            <p>Don't have an account? <button onClick={() => setIsCreatingAccount(true)}>Create Account</button></p>
          )}
        </div>
        {errorMessage && <p>{errorMessage}</p>}
        <button onClick={() => setShowLogin(false)}>Close</button>
      </div>
    </div>
  );
}
