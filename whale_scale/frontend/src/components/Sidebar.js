// File: Sidebar.js
// Authors: Alan Qiao, August Hao, Ciaran Burr
// Purpose: Interactive sidebar for WhaleScale that handles image metadata input,
// focal length/altitude settings, width segment configuration, and pixel dimension calculation.
// Provides real-time form validation and backend communication for measurement setup.
// MINIMAL UPDATE: Only added whale naming input field

import React, { useState, useEffect } from "react";
import "./Sidebar.css";

export default function Sidebar({ 
  metadata, 
  formData, 
  onImageUpload, 
  onSubmit, 
  onInputChange, 
  isExtractingMetadata,
  onShowSavedData,
  currentWhaleId
}) {
  const [pixelDimension, setPixelDimension] = useState(null);
  const [whaleNameSuggestions, setWhaleNameSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch whale name suggestions
  const fetchWhaleNameSuggestions = async () => {
    try {
      const response = await fetch("/api/collatrix/get_user_images/", {
        method: "GET",
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        const images = data.images || [];
        
        const whaleNames = new Set();
        images.forEach(img => {
          const filename = img.filename || img.original_filename || "";
          const nameMatch = filename.match(/^([A-Za-z_]+)\d*\./);
          if (nameMatch) {
            whaleNames.add(nameMatch[1]);
          }
        });
        
        setWhaleNameSuggestions(Array.from(whaleNames).sort());
      }
    } catch (error) {
      console.error("Error fetching whale name suggestions:", error);
    }
  };

  useEffect(() => {
    fetchWhaleNameSuggestions();
  }, []);

  const handleInputChange = (name, value) => {
    onInputChange(name, value);
    if (name === "whaleName") {
      setShowSuggestions(value.length > 0);
    }
  };

  const handleWhaleSuggestionClick = (suggestion) => {
    handleInputChange("whaleName", suggestion);
    setShowSuggestions(false);
  };

  const calculatePixelDimension = async () => {
    try {
      let payload = {
        altitude: parseFloat(formData.altitude),
        image_width: parseInt(formData.imageWidth)
      };

      if (formData.fov) {
        payload.fov = parseFloat(formData.fov);
      } else if (formData.focalLength && formData.sensorWidth) {
        payload.focal_length = parseFloat(formData.focalLength);
        payload.sensor_width = parseFloat(formData.sensorWidth);
      } else {
        alert("Please provide either FOV or both focal length and sensor width");
        return;
      }

      const response = await fetch("/api/collatrix/compute_pixel_dimension/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        setPixelDimension(result.pixel_dimension);
      } else {
        alert("Error calculating pixel dimension. Check your inputs.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Network error calculating pixel dimension");
    }
  };

  const handleSubmit = () => {
    const dataToSubmit = { ...formData, pixelDimension };
    onSubmit(dataToSubmit);
  };

  const exportData = () => {
    if (window.exportDataToCSV) {
      window.exportDataToCSV();
    } else {
      alert("Export function not available. Please make sure measurements are loaded.");
    }
  };

  return (
    <div className="sidebar">
      <h2>WhaleScale</h2>
      
      {/* NEW: Simple whale name input */}
      <div className="input-group" style={{ position: 'relative' }}>
        <label>🐋 Whale Name:</label>
        <input
          type="text"
          value={formData.whaleName || ""}
          onChange={(e) => handleInputChange("whaleName", e.target.value)}
          placeholder="Enter whale name (e.g., Moby)"
          onFocus={() => setShowSuggestions(formData.whaleName && formData.whaleName.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {currentWhaleId && (
          <span className="whale-id-display">Current ID: {currentWhaleId}</span>
        )}
        {showSuggestions && whaleNameSuggestions.length > 0 && (
          <div className="whale-suggestions">
            {whaleNameSuggestions
              .filter(name => name.toLowerCase().includes((formData.whaleName || "").toLowerCase()))
              .map(suggestion => (
                <div 
                  key={suggestion}
                  className="whale-suggestion-item"
                  onClick={() => handleWhaleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* Show warning if no whale name */}
      {(!formData.whaleName || formData.whaleName.trim() === "") && (
        <div className="whale-name-requirement">
          ⚠️ Please enter a whale name before uploading an image
        </div>
      )}

      <label 
        className={`upload-button ${(!formData.whaleName || formData.whaleName.trim() === "") ? 'disabled' : ''}`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) {
              if (!formData.whaleName || formData.whaleName.trim() === "") {
                alert("Please enter a whale name first!");
                e.target.value = "";
                return;
              }
              onImageUpload(file);
            }
          }}
          disabled={!formData.whaleName || formData.whaleName.trim() === "" || isExtractingMetadata}
          style={{ display: 'none' }}
        />
        {isExtractingMetadata ? "Extracting Metadata..." : 
         (!formData.whaleName || formData.whaleName.trim() === "") ? "Enter Whale Name First" : 
         "Upload Image"}
      </label>

      <div className="input-group">
        <label>Focal Length (mm):</label>
        <input
          type="number"
          value={formData.focalLength || ""}
          onChange={(e) => handleInputChange("focalLength", e.target.value)}
          placeholder="e.g., 24"
        />
      </div>

      <div className="input-group">
        <label>Altitude (m):</label>
        <input
          type="number"
          value={formData.altitude || ""}
          onChange={(e) => handleInputChange("altitude", e.target.value)}
          placeholder="e.g., 25.5"
        />
      </div>

      <div className="input-group">
        <label>Altitude Offset (m):</label>
        <input
          type="number"
          value={formData.altitudeOffset || ""}
          onChange={(e) => handleInputChange("altitudeOffset", e.target.value)}
          placeholder="e.g., 2.0"
        />
      </div>

      <div className="input-group">
        <label>Image Width (px):</label>
        <input
          type="number"
          value={formData.imageWidth || ""}
          onChange={(e) => handleInputChange("imageWidth", e.target.value)}
          placeholder="e.g., 4000"
        />
      </div>

      <div className="input-group">
        <label>Image Height (px):</label>
        <input
          type="number"
          value={formData.imageHeight || ""}
          onChange={(e) => handleInputChange("imageHeight", e.target.value)}
          placeholder="e.g., 3000"
        />
      </div>

      <div className="input-group">
        <label>Field of View (°):</label>
        <input
          type="number"
          value={formData.fov || ""}
          onChange={(e) => handleInputChange("fov", e.target.value)}
          placeholder="e.g., 84"
        />
      </div>

      <div className="input-group">
        <label>Sensor Width (mm):</label>
        <input
          type="number"
          value={formData.sensorWidth || ""}
          onChange={(e) => handleInputChange("sensorWidth", e.target.value)}
          placeholder="e.g., 13.2"
        />
      </div>

      <div className="input-group">
        <label>Width Segments:</label>
        <input
          type="number"
          value={formData.widthSegments || ""}
          onChange={(e) => handleInputChange("widthSegments", e.target.value)}
          placeholder="e.g., 5"
          min="0"
        />
      </div>

      <div className="input-group">
        <label>Crosshair Size:</label>
        <input
          type="range"
          min="10"
          max="100"
          value={formData.crosshairSize || 50}
          onChange={(e) => handleInputChange("crosshairSize", e.target.value)}
        />
        <span>{formData.crosshairSize || 50}</span>
      </div>

      <div className="input-group">
        <label>Crosshair Opacity:</label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.crosshairOpacity || 100}
          onChange={(e) => handleInputChange("crosshairOpacity", e.target.value)}
        />
        <span>{formData.crosshairOpacity || 100}%</span>
      </div>

      <div className="input-group">
        <label>Segment Color:</label>
        <input
          type="color"
          className="color-picker"
          value={formData.segmentColor || "#FFFFC5"}
          onChange={(e) => handleInputChange("segmentColor", e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Crosshair Color:</label>
        <input
          type="color"
          className="color-picker"
          value={formData.crosshairColor || "#FF0000"}
          onChange={(e) => handleInputChange("crosshairColor", e.target.value)}
        />
      </div>

      <button 
        className="submit-button"
        onClick={calculatePixelDimension}
        disabled={!formData.altitude || !formData.imageWidth}
      >
        Calculate Pixel Dimension
      </button>

      {pixelDimension && (
        <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
          <strong>Pixel Dimension: {pixelDimension.toFixed(6)} m/pixel</strong>
        </div>
      )}

      <div className="button-group">
        <button 
          className="submit-button"
          onClick={handleSubmit}
          disabled={!pixelDimension}
        >
          Submit Parameters
        </button>
        
        <button 
          className="export-button"
          onClick={exportData}
        >
          Export Data to CSV
        </button>
        
        <button 
          className="export-button"
          onClick={onShowSavedData}
        >
          View Saved Data
        </button>
      </div>
    </div>
  );
}