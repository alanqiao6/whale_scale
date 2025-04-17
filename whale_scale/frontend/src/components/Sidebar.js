"use client";
import React, { useState, useEffect } from "react";
import "./Sidebar.css";

export default function Sidebar({ metadata, formData, onImageUpload, onSubmit, onInputChange }) {
  // Use formData passed from parent instead of local state
  
  // Function to handle image upload from Sidebar
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      onImageUpload(file); // Calls the function from App.js
    }
  };

  // Function to handle input changes
  const handleChange = (name, value) => {
    // Notify parent component of the change
    onInputChange(name, value);
  };

  const handleSubmit = () => {
    // Submit the form data back to the parent
    onSubmit(formData);
  };

  return (
    <div className="sidebar">
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

      <div className="input-group">
        <label>Focal Length (mm)</label>
        <input 
          type="number" 
          id="focal-length" 
          value={formData.focalLength} 
          onChange={(e) => handleChange("focalLength", e.target.value)} 
          aria-required="true" 
        />
      </div>

      <div className="input-group">
        <label>Altitude (m)</label>
        <input 
          type="number" 
          id="altitude" 
          value={formData.altitude} 
          onChange={(e) => handleChange("altitude", e.target.value)} 
          aria-required="true" 
        />
      </div>

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

      <button className="submit-button" onClick={handleSubmit}>
        Submit
      </button>
      <button className="export-button">Export 📤</button>
    </div>
  );
} 