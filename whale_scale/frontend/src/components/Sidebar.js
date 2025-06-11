// File: Sidebar.js
// Authors: Alan Qiao, August Hao, Ciaran Burr
// Purpose: Interactive sidebar for WhaleScale that handles image metadata input,
// focal length/altitude settings, width segment configuration, and pixel dimension calculation.
// Provides real-time form validation and backend communication for measurement setup.
// UPDATED: Added whale naming functionality with real-time ID generation

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
  currentWhaleId  // NEW: Receive current whale ID
}) {
  const [pixelDimension, setPixelDimension] = useState(null);
  const [errors, setErrors] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);

  // NEW: State for whale name suggestions
  const [whaleNameSuggestions, setWhaleNameSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // NEW: Fetch whale name suggestions from existing images
  const fetchWhaleNameSuggestions = async () => {
    try {
      const response = await fetch("/api/collatrix/get_user_images/", {
        method: "GET",
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        const images = data.images || [];
        
        // Extract unique whale names from filenames
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

  // NEW: Load suggestions when component mounts
  useEffect(() => {
    fetchWhaleNameSuggestions();
  }, []);

  const handleInputChange = (name, value) => {
    onInputChange(name, value);
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }

    // NEW: Show suggestions when typing whale name
    if (name === "whaleName") {
      setShowSuggestions(value.length > 0);
    }
  };

  // NEW: Handle whale name suggestion selection
  const handleWhaleSuggestionClick = (suggestion) => {
    handleInputChange("whaleName", suggestion);
    setShowSuggestions(false);
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Check for required fields based on calculation method
    if (formData.focalLength && formData.altitude && formData.imageWidth) {
      // Option A or B validation
      if (!formData.fov && (!formData.sensorWidth)) {
        newErrors.calculation = "Either FOV or sensor width is required for pixel dimension calculation";
      }
    }
    
    if (formData.focalLength && !formData.altitude) {
      newErrors.altitude = "Altitude is required when focal length is provided";
    }
    
    if (formData.altitude && !formData.focalLength) {
      newErrors.focalLength = "Focal length is required when altitude is provided";
    }

    // NEW: Validate whale name
    if (formData.whaleName && formData.whaleName.trim() === "") {
      newErrors.whaleName = "Whale name cannot be empty";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculatePixelDimension = async () => {
    if (!validateForm()) return;
    
    setIsCalculating(true);
    
    try {
      let payload = {
        altitude: parseFloat(formData.altitude),
        image_width: parseInt(formData.imageWidth)
      };

      // Option A: Using FOV
      if (formData.fov) {
        payload.fov = parseFloat(formData.fov);
      }
      // Option B: Using focal length and sensor width
      else if (formData.focalLength && formData.sensorWidth) {
        payload.focal_length = parseFloat(formData.focalLength);
        payload.sensor_width = parseFloat(formData.sensorWidth);
      } else {
        alert("Please provide either FOV or both focal length and sensor width");
        setIsCalculating(false);
        return;
      }

      const response = await fetch("/api/collatrix/compute_pixel_dimension/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        setPixelDimension(result.pixel_dimension);
        console.log("Pixel dimension calculated:", result.pixel_dimension);
      } else {
        const errorText = await response.text();
        console.error("Error calculating pixel dimension:", errorText);
        alert("Error calculating pixel dimension. Check your inputs.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Network error calculating pixel dimension");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      alert("Please fix the errors before submitting");
      return;
    }

    const dataToSubmit = {
      ...formData,
      pixelDimension
    };
    
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
      <div className="sidebar-content">
        <h2>WhaleScale</h2>
        
        {/* NEW: Whale Naming Section */}
        <div className="form-section">
          <h3>🐋 Whale Identification</h3>
          <div className="form-group whale-name-group">
            <label htmlFor="whaleName">
              Whale Name:
              {currentWhaleId && (
                <span className="whale-id-display">
                  Current ID: <strong>{currentWhaleId}</strong>
                </span>
              )}
            </label>
            <div className="whale-name-input-container">
              <input
                type="text"
                id="whaleName"
                value={formData.whaleName || ""}
                onChange={(e) => handleInputChange("whaleName", e.target.value)}
                placeholder="Enter whale name (e.g., Moby, Orca1, BlueBay)"
                className={errors.whaleName ? "error" : ""}
                onFocus={() => setShowSuggestions(formData.whaleName && formData.whaleName.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow suggestion clicks
              />
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
            {errors.whaleName && <span className="error-text">{errors.whaleName}</span>}
            <small className="help-text">
              Images will be saved as {formData.whaleName || "WhaleName"}1.jpg, {formData.whaleName || "WhaleName"}2.jpg, etc.
            </small>
          </div>
        </div>

        <div className="form-section">
          <h3>📷 Image Upload</h3>
          <label htmlFor="image-upload-sidebar" className="upload-button">
            <input
              type="file"
              id="image-upload-sidebar"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) onImageUpload(file);
              }}
              hidden
            />
            {isExtractingMetadata ? "Extracting Metadata..." : "Upload New Image"}
          </label>
          {isExtractingMetadata && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <span>Processing image metadata...</span>
            </div>
          )}
        </div>

        <div className="form-section">
          <h3>📐 Measurement Parameters</h3>
          
          <div className="form-group">
            <label htmlFor="focalLength">Focal Length (mm):</label>
            <input
              type="number"
              id="focalLength"
              value={formData.focalLength || ""}
              onChange={(e) => handleInputChange("focalLength", e.target.value)}
              placeholder="e.g., 24"
              className={errors.focalLength ? "error" : ""}
            />
            {errors.focalLength && <span className="error-text">{errors.focalLength}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="altitude">Altitude (m):</label>
            <input
              type="number"
              id="altitude"
              value={formData.altitude || ""}
              onChange={(e) => handleInputChange("altitude", e.target.value)}
              placeholder="e.g., 25.5"
              className={errors.altitude ? "error" : ""}
            />
            {errors.altitude && <span className="error-text">{errors.altitude}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="altitudeOffset">Altitude Offset (m):</label>
            <input
              type="number"
              id="altitudeOffset"
              value={formData.altitudeOffset || ""}
              onChange={(e) => handleInputChange("altitudeOffset", e.target.value)}
              placeholder="e.g., 2.0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="imageWidth">Image Width (px):</label>
            <input
              type="number"
              id="imageWidth"
              value={formData.imageWidth || ""}
              onChange={(e) => handleInputChange("imageWidth", e.target.value)}
              placeholder="e.g., 4000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="imageHeight">Image Height (px):</label>
            <input
              type="number"
              id="imageHeight"
              value={formData.imageHeight || ""}
              onChange={(e) => handleInputChange("imageHeight", e.target.value)}
              placeholder="e.g., 3000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="fov">Field of View (°):</label>
            <input
              type="number"
              id="fov"
              value={formData.fov || ""}
              onChange={(e) => handleInputChange("fov", e.target.value)}
              placeholder="e.g., 84"
            />
          </div>

          <div className="form-group">
            <label htmlFor="sensorWidth">Sensor Width (mm):</label>
            <input
              type="number"
              id="sensorWidth"
              value={formData.sensorWidth || ""}
              onChange={(e) => handleInputChange("sensorWidth", e.target.value)}
              placeholder="e.g., 13.2"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>📏 Ruler Configuration</h3>
          
          <div className="form-group">
            <label htmlFor="widthSegments">Width Segments:</label>
            <input
              type="number"
              id="widthSegments"
              value={formData.widthSegments || ""}
              onChange={(e) => handleInputChange("widthSegments", e.target.value)}
              placeholder="e.g., 5"
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="crosshairSize">Crosshair Size:</label>
            <input
              type="range"
              id="crosshairSize"
              min="10"
              max="100"
              value={formData.crosshairSize || 50}
              onChange={(e) => handleInputChange("crosshairSize", e.target.value)}
            />
            <span className="range-value">{formData.crosshairSize || 50}</span>
          </div>

          <div className="form-group">
            <label htmlFor="crosshairOpacity">Crosshair Opacity:</label>
            <input
              type="range"
              id="crosshairOpacity"
              min="0"
              max="100"
              value={formData.crosshairOpacity || 100}
              onChange={(e) => handleInputChange("crosshairOpacity", e.target.value)}
            />
            <span className="range-value">{formData.crosshairOpacity || 100}%</span>
          </div>

          <div className="form-group">
            <label htmlFor="segmentColor">Segment Color:</label>
            <input
              type="color"
              id="segmentColor"
              value={formData.segmentColor || "#FFFFC5"}
              onChange={(e) => handleInputChange("segmentColor", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="crosshairColor">Crosshair Color:</label>
            <input
              type="color"
              id="crosshairColor"
              value={formData.crosshairColor || "#FF0000"}
              onChange={(e) => handleInputChange("crosshairColor", e.target.value)}
            />
          </div>
        </div>

        {errors.calculation && (
          <div className="error-message">
            {errors.calculation}
          </div>
        )}

        <div className="form-section">
          <button 
            className="calculate-button"
            onClick={calculatePixelDimension}
            disabled={isCalculating || !formData.altitude || !formData.imageWidth}
          >
            {isCalculating ? "Calculating..." : "Calculate Pixel Dimension"}
          </button>

          {pixelDimension && (
            <div className="pixel-dimension-result">
              <p><strong>Pixel Dimension:</strong> {pixelDimension.toFixed(6)} m/pixel</p>
            </div>
          )}

          <button 
            className="submit-button"
            onClick={handleSubmit}
            disabled={!pixelDimension}
          >
            Submit Parameters
          </button>
        </div>

        <div className="form-section">
          <h3>💾 Data Management</h3>
          <button 
            className="export-button"
            onClick={exportData}
          >
            Export Data to CSV
          </button>
          
          <button 
            className="saved-data-button"
            onClick={onShowSavedData}
          >
            View Saved Data
          </button>
        </div>

        {/* NEW: Display current whale information */}
        {currentWhaleId && (
          <div className="form-section current-whale-info">
            <h3>🎯 Current Session</h3>
            <div className="whale-info-display">
              <p><strong>Active Whale:</strong> {currentWhaleId}</p>
              {formData.whaleName && (
                <p><strong>Base Name:</strong> {formData.whaleName}</p>
              )}
              <small>All measurements will be saved under this whale ID</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}