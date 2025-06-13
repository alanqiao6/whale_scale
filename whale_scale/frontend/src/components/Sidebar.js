// File: sidebar.js
// Authors: Alan Qiao, August Hao, Ciaran Burr
// Purpose: This component renders the interactive sidebar UI in WhaleScale,
// allowing users to upload an image, view or override extracted metadata, adjust configuration parameters (e.g. width segments, crosshair size/color),
// and submit data to the backend for pixel dimension calculation via Collatrix.
// Also enables CSV export via an exposed global export function and handles basic validation and error messaging.
// UPDATED: Added authentication check for saved data button
// FIXED: Listen for auth state changes to update UI without page refresh

"use client";
import React, { useState, useEffect } from "react";
import "./Sidebar.css";

// Use window.location.origin to determine the base URL dynamically
const API_BASE_URL = window.location.origin;

// CHANGE THIS LINE: Add onShowSavedData to the function parameters
export default function Sidebar({ metadata, formData, onImageUpload, onSubmit, onInputChange, isExtractingMetadata, onShowSavedData }) {
  const [error, setError] = useState("");
  const [inputConflict, setInputConflict] = useState(false);
  const [user, setUser] = useState(null); // Track authentication status
  const [showLoginPrompt, setShowLoginPrompt] = useState(false); // Show login prompt modal
  
  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // FIXED: Listen for auth state changes from other components
  useEffect(() => {
    const handleAuthStateChange = (event) => {
      const { user: newUser, isAuthenticated } = event.detail;
      console.log('Sidebar received auth state change:', { newUser, isAuthenticated });
      setUser(isAuthenticated ? newUser : null);
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);

    // Cleanup event listener
    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, []);

  // Function to check if user is authenticated
  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/api/user/`, {
        credentials: 'include'
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // User is not authenticated
        setUser(null);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    }
  };

  // Handle saved data button click
  const handleSavedDataClick = () => {
    if (user) {
      // User is authenticated, show saved data
      onShowSavedData();
    } else {
      // User is not authenticated, show login prompt
      setShowLoginPrompt(true);
    }
  };

  // Close login prompt and redirect to login
  const handleLoginPromptClose = () => {
    setShowLoginPrompt(false);
  };

  // Function to handle image upload from Sidebar
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      onImageUpload(file); // Calls the function from App.js
      setError("");
    }
  };

  // Function to handle input changes
  const handleChange = (name, value) => {
    // Notify parent component of the change
    onInputChange(name, value);

    setInputConflict(false);
  };

  const handleSubmit = async () => {
    try {
      setError("");
  
      // Validate that an image was uploaded (by checking formData.imageWidth, not metadata)
      if (!formData.imageWidth || !formData.imageHeight) {
        setError("⚠️ Please upload an image before submitting.");
        return;
      }
  
      // Validate width segments
      if (!formData.widthSegments || isNaN(formData.widthSegments) || parseInt(formData.widthSegments) <= 0) {
        setError("⚠️ Please enter a valid number of width segments.");
        return;
      }
  
      const payload = {
        altitude: parseFloat(formData.altitude),
        focal_length: parseFloat(formData.focalLength),
        image_width: parseInt(formData.imageWidth),
        fov: parseFloat(formData.fov),
        sensor_width: parseFloat(formData.sensorWidth)
      };
  
      const response = await fetch("/api/collatrix/compute_pixel_dimension/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
  
      const result = await response.json();
  
      if (response.ok && result.pixel_dimension) {
        onSubmit({ ...formData, pixelDimension: result.pixel_dimension });
      } else {
        throw new Error(result.error || "Failed to compute pixel dimension");
      }
    } catch (err) {
      setError(`❌ Error: ${err.message}`);
    }
  };
  
  // Enhanced export function with detailed debugging
  const handleExport = () => {
    console.log("Export button clicked");
    
    // Check if the export function exists
    if (typeof window.exportDataToCSV === 'function') {
      console.log("Export function found, executing...");
      try {
        window.exportDataToCSV();
        console.log("Export function executed successfully");
      } catch (err) {
        console.error("Error during export:", err);
        setError(`❌ Export error: ${err.message}`);
      }
    } else {
      console.error("Export function not found on window object");
      setError("⚠️ Export function not available. Please submit data first.");
    }
  };

  // Define a style for labels to ensure proper contrast
  const labelStyle = {
    color: "#FFFFFF", // White text for maximum contrast
    fontWeight: "bold"
  };

  const renderInput = (label, name, disabled = false) => (
    <div className="input-group">
      <label htmlFor={`input-${name}`} style={labelStyle}>{label}</label>
      <input
        type="number"
        id={`input-${name}`}
        name={name}
        value={formData[name]}
        disabled={disabled || isExtractingMetadata}
        onChange={(e) => handleChange(name, e.target.value)}
        aria-describedby={`${name}-help`}
      />
      <span id={`${name}-help`} className="sr-only">Enter the {label.toLowerCase()}</span>
    </div>
  );

  return (
    <div className="sidebar" role="complementary" aria-label="Configuration controls">
      <div className="upload-section">
        <label className="upload-button" htmlFor="image-upload" tabIndex="0" aria-label="Upload an image" onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            document.getElementById("image-upload").click(); // Trigger file input click
          }
        }}>
          📄 Add Image
          <input type="file" id="image-upload" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} aria-describedby="upload-help" />
        </label>
        <p id="upload-help" className="sr-only">Choose an image to upload for processing.</p>
      </div>

      {/* Whale name input */}
      <div className="input-group">
        <label htmlFor="whale-name" style={labelStyle}>Whale Name</label>
        <input
          type="text"
          id="whale-name"
          name="whaleName"
          value={formData.whaleName || ""}
          onChange={(e) => handleChange("whaleName", e.target.value)}
          placeholder="Enter whale name"
          disabled={isExtractingMetadata}
        />
      </div>

      {/* Loading message for metadata extraction */}
      {isExtractingMetadata && (
        <div style={{ 
          padding: "10px", 
          margin: "10px 0", 
          backgroundColor: "#f0f8ff", 
          border: "1px solid #007acc",
          borderRadius: "4px",
          textAlign: "center",
          color: "#007acc",
          fontWeight: "bold"
        }}>
          🔍 Scraping image metadata...
        </div>
      )}

      {renderInput("Altitude (m)", "altitude", false)}
      {renderInput("Altitude Offset (m)", "altitudeOffset", false)}
      {renderInput("Image Width (px)", "imageWidth", false)}
      {renderInput("Image Height (px)", "imageHeight", false)}
      {renderInput("Focal Length (mm)", "focalLength", false)}
      {renderInput("Field of View (°)", "fov", false)}
      {renderInput("Sensor Width (mm)", "sensorWidth", false)}

      <div className="input-group">
      <label htmlFor="width-segments" style={labelStyle}>
        # Width Segments <span aria-hidden="true">⚠️</span>
        <span className="sr-only">required field</span>
      </label>
        <input 
          type="number" 
          id="width-segments" 
          name="widthSegments"
          value={formData.widthSegments} 
          onChange={(e) => handleChange("widthSegments", e.target.value)} 
          disabled={isExtractingMetadata}
          aria-required="true"
          aria-describedby="width-segments-help"
        />
        <span id="width-segments-help" className="sr-only">Enter the number of width segments. This field is required.</span>
      </div>

      <div className="input-group">
        <label htmlFor="crosshair-size" style={labelStyle}>Crosshair Size</label>
        <input
          type="range"
          id="crosshair-size"
          name="crosshairSize"
          min="0"
          max="100"
          value={formData.crosshairSize}
          onChange={(e) => handleChange("crosshairSize", e.target.value)}
          disabled={isExtractingMetadata}
          aria-valuenow={formData.crosshairSize}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Adjust crosshair size"
        />
      </div>

      <div className="input-group">
        <label htmlFor="crosshair-color" style={labelStyle}>Crosshair Color</label>
        <input
          type="color"
          id="crosshair-color"
          name="crosshairColor"
          value={formData.crosshairColor || "#FF0000"}
          onChange={(e) => handleChange("crosshairColor", e.target.value)}
          disabled={isExtractingMetadata}
          className="color-picker"
          aria-label="Select crosshair color"
        />
      </div>

      <div className="input-group">
        <label htmlFor="segment-color" style={labelStyle}>Segment Color</label>
        <input
          type="color"
          id="segment-color"
          name="segmentColor"
          value={formData.segmentColor}
          onChange={(e) => handleChange("segmentColor", e.target.value)}
          disabled={isExtractingMetadata}
          className="color-picker"
          aria-label="Select segment color"
        />
      </div>

      {inputConflict && (
        <p style={{ color: "#cc7000", fontWeight: "bold" }} role="alert">
          ⚠️ Your input does not match extracted metadata.
        </p>
      )}

      {error && (
        <p style={{ color: "#d32f2f", fontWeight: "bold" }} role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      <button 
        className="submit-button" 
        onClick={handleSubmit}
        disabled={isExtractingMetadata}
        aria-label="Submit configuration"
      >
        Submit
      </button>
      <p style={{ fontSize: "0.8em", color: "#000000", marginTop: "4px", marginBottom: "12px" }}>
        <span aria-hidden="true">⚠️</span> <span style={{ fontWeight: "bold" }}>required field</span>
      </p>
      
      <button 
        className="export-button" 
        onClick={handleExport}
        disabled={isExtractingMetadata}
        aria-label="Export data to CSV"
        style={{ marginBottom: "8px" }}
      >
        Export 📤
      </button>
      
      {/* UPDATED: Authentication-protected saved data button with real-time auth updates */}
      <button
        className="saved-data-button"
        onClick={handleSavedDataClick}
        disabled={isExtractingMetadata}
        style={{
          width: "100%",
          padding: "10px",
          background: user ? "#2196F3" : "#9E9E9E", // Gray if not authenticated
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: isExtractingMetadata ? "not-allowed" : (user ? "pointer" : "pointer"),
          fontSize: "14px",
          fontWeight: "bold",
          opacity: isExtractingMetadata ? 0.5 : 1
        }}
        aria-label={user ? "View previously saved data and measurements" : "Login required to view saved data"}
      >
        📁 {user ? "View Saved Data" : "View Saved Data (Login Required)"}
      </button>

      {/* Login prompt modal */}
      {showLoginPrompt && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "8px",
            maxWidth: "400px",
            margin: "20px",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
          }}>
            <h3 style={{ color: "#333", marginBottom: "15px" }}>🔒 Login Required</h3>
            <p style={{ color: "#666", marginBottom: "20px", lineHeight: "1.5" }}>
              You need to be logged in to view and manage your saved measurements and whale data.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={handleLoginPromptClose}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#f5f5f5",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                  color: "#333"
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleLoginPromptClose();
                  // Trigger the login modal from TopBar
                  window.dispatchEvent(new CustomEvent('showLoginModal'));
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#2196F3",
                  border: "none",
                  borderRadius: "4px",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}