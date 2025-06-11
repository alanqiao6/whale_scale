// File: Sidebar.js
// Authors: Alan Qiao, August Hao, Ciaran Burr
// Purpose: Interactive sidebar for WhaleScale that handles image metadata input,
// focal length/altitude settings, width segment configuration, and pixel dimension calculation.
// Provides real-time form validation and backend communication for measurement setup.

import React, { useState } from "react";
import "./Sidebar.css";

export default function Sidebar({ 
  metadata, 
  formData, 
  onImageUpload, 
  onSubmit, 
  onInputChange, 
  isExtractingMetadata,
  onShowSavedData
}) {
  const [pixelDimension, setPixelDimension] = useState(null);

  const handleInputChange = (name, value) => {
    onInputChange(name, value);
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
      
      {/* ONLY NEW ADDITION: Whale name input box */}
      <div className="input-group">
        <label>Whale Name:</label>
        <input
          type="text"
          value={formData.whaleName || ""}
          onChange={(e) => handleInputChange("whaleName", e.target.value)}
          placeholder="Enter whale name"
        />
      </div>

      <label className="upload-button">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) onImageUpload(file);
          }}
          style={{ display: 'none' }}
        />
        {isExtractingMetadata ? "Extracting Metadata..." : "Upload Image"}
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

      <button 
        className="submit-button"
        onClick={handleSubmit}
        disabled={!pixelDimension}
      >
        Submit Parameters
      </button>

      <div className="button-group">
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