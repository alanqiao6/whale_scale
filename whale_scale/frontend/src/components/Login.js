import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ setIsLoggedIn, setShowLogin, setUsername, isLoggedIn, currentUsername }) {
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false); // Track if user is creating a new account

  // If already logged in, show the user menu instead of login form
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
      // Send request to backend to check if user credentials are correct
      const response = await axios.post('http://localhost:8000/api/login', { 
        username: usernameInput, 
        password 
      });
      
      // Check if the login was successful based on the message returned
      if (response.data.message === "Login successful") {
        // If login is successful
        setIsLoggedIn(true);
        setUsername(response.data.username);
        setShowLogin(false);
      } else {
        // If credentials are incorrect
        setErrorMessage('Error: Invalid username or password');
      }
    } catch (error) {
      // Handle error if something went wrong (e.g., server error)
      setErrorMessage(error.response?.data?.detail || 'Error: Something went wrong, please try again later.');
      console.error(error);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    
    try {
      // Send request to backend to create a new account
      const response = await axios.post('http://localhost:8000/api/create-account', { 
        username: usernameInput, 
        password 
      });
      
      // Check if account creation was successful
      if (response.data.message === "Account created and login successful") {
        setIsLoggedIn(true);
        setUsername(response.data.username);
        setShowLogin(false);
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