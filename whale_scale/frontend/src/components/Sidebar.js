"use client";
import React, { useState, useEffect } from "react";
import "./Sidebar.css";

export default function Sidebar({ metadata, formData, onImageUpload, onSubmit, onInputChange }) {
  const [mode, setMode] = useState("extract");
  const [error, setError] = useState("");
  const [inputConflict, setInputConflict] = useState(false);
  
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

    if (mode === "manual" && metadata[name] && value !== "" && value !== metadata[name].toString()) {
      setInputConflict(true);
    } else {
      setInputConflict(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setError("");
      const payload = {
        altitude: parseFloat(formData.altitude),
        focal_length: parseFloat(formData.focalLength),
        image_width: parseInt(metadata.image_width || formData.imageWidth),
        fov: parseFloat(metadata.fov || formData.fov),
        sensor_width: parseFloat(formData.sensorWidth)
      };

      const response = await fetch("/collatrix/compute_pixel_dimension/", {
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
      setError(err.message);
    }
  };

  const renderInput = (label, name, disabled = false) => (
    <div className="input-group">
      <label>{label}</label>
      <input
        type="number"
        value={formData[name]}
        disabled={disabled}
        onChange={(e) => handleChange(name, e.target.value)}
      />
    </div>
  );

  return (
    <div className="sidebar">
      <div className="upload-section">
        <label>📁 Mode:</label>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="extract">Extract Metadata</option>
          <option value="manual">Manual Entry</option>
        </select>
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

      {mode === "extract" && !metadata.focalLength && (
        <p className="warning-text">⚠️ Please upload an image</p>
      )}


      {renderInput("Altitude (m)", "altitude", mode === "extract")}
      {renderInput("Altitude Offset (m)", "altitudeOffset", false)}
      {renderInput("Image Width (px)", "imageWidth", mode === "extract")}
      {renderInput("Image Height (px)", "imageHeight", mode === "extract")}
      {renderInput("Focal Length (mm)", "focalLength", mode === "extract")}
      {renderInput("Field of View (°)", "fov", mode === "extract")}
      {renderInput("Sensor Width (mm)", "sensorWidth", mode === "extract")}

      <div className="input-group">
        <label># Width Segments</label>
        <input 
          type="number" 
          id="width-segments" 
          value={formData.widthSegments} 
          onChange={(e) => handleChange("widthSegments", e.target.value)} 
        />
      </div>

      <div className="input-group">
        <label>Crosshair Size</label>
        <input
          type="range"
          id="crosshair-size"
          min="0"
          max="100"
          value={formData.crosshairSize}
          onChange={(e) => handleChange("crosshairSize", e.target.value)}
          aria-valuenow={formData.crosshairSize}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Adjust crosshair size"
        />
      </div>

      <div className="input-group">
        <label htmlFor="crosshair-opacity">Crosshair Opacity</label>
        <input
          type="range"
          id="crosshair-opacity"
          min="0"
          max="100"
          value={formData.crosshairOpacity}
          onChange={(e) => handleChange("crosshairOpacity", e.target.value)}
          aria-valuenow={formData.crosshairOpacity}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Adjust crosshair opacity"
        />
      </div>

      <div className="input-group">
        <label htmlFor="segment-color">Segment Color</label>
        <input
          type="color"
          id="segment-color"
          value={formData.segmentColor}
          onChange={(e) => handleChange("segmentColor", e.target.value)}
          className="color-picker"
          aria-label="Select segment color"
        />
      </div>

      {inputConflict && (
        <p style={{ color: "orange", fontWeight: "bold" }}>
          ⚠️ Your input does not match extracted metadata.
        </p>
      )}

      {error && (
        <p style={{ color: "red", fontWeight: "bold" }}>
          ❌ Error: {error}
        </p>
      )}

      <button className="submit-button" onClick={handleSubmit}>
        Submit
      </button>
      <button className="export-button">Export 📤</button>
    </div>
  );
} 