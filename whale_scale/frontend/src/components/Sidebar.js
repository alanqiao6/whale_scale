// File: sidebar.js
// Authors: Alan Qiao, August Hao, Ciaran Burr
// Purpose: This component renders the interactive sidebar UI in WhaleScale,
// allowing users to upload an image, view or override extracted metadata, adjust configuration parameters (e.g. width segments, crosshair size/color),
// and submit data to the backend for pixel dimension calculation via Collatrix.
// Also enables CSV export via an exposed global export function and handles basic validation and error messaging.

"use client";
import React, { useState, useEffect } from "react";
import "./Sidebar.css";

// CHANGE THIS LINE: Add onShowSavedData to the function parameters
export default function Sidebar({ metadata, formData, onImageUpload, onSubmit, onInputChange, isExtractingMetadata, onShowSavedData }) {
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

      {/* ONLY NEW ADDITION: Whale name input */}
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
      
      {/* ADD THIS NEW BUTTON HERE - right after the export button */}
      <button 
        className="export-button" 
        onClick={handleExport}
        disabled={isExtractingMetadata}
        aria-label="Export data to CSV"
        style={{ marginBottom: "8px" }}
      >
        Export 📤
      </button>
      
      {/* ADD THIS NEW BUTTON */}
      <button
        className="saved-data-button"
        onClick={onShowSavedData}
        disabled={isExtractingMetadata}
        style={{
          width: "100%",
          padding: "10px",
          background: "#2196F3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "bold"
        }}
        aria-label="View previously saved data and measurements"
      >
        📁 View Saved Data
      </button>
    </div>
  );
}