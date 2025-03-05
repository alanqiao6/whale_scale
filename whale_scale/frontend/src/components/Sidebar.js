"use client";
import React, { useState, useEffect } from "react";
import "./Sidebar.css";

export default function Sidebar({ metadata, onImageUpload }) {
  const [focalLength, setFocalLength] = useState("");
  const [altitude, setAltitude] = useState("");
  const [widthSegments, setWidthSegments] = useState("");
  const [mirrorSide, setMirrorSide] = useState("None");
  const [crosshairSize, setCrosshairSize] = useState(50);
  const [crosshairOpacity, setCrosshairOpacity] = useState(100);
  const [crosshairColor, setCrosshairColor] = useState("#e7403e");
  const [message, setMessage] = useState(""); // To display response message

  // Auto-fill metadata fields when metadata updates
  useEffect(() => {
    if (metadata) {
      setFocalLength(metadata.focalLength || "");
      setAltitude(metadata.altitude || "");
    }
  }, [metadata]);

  // Function to handle image upload from Sidebar
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      onImageUpload(file); // Calls the function from App.js
    }
  };

  // Function to submit form data
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Validate required fields
    if (!focalLength || !altitude) {
      setMessage("Please fill in all required fields.");
      return;
    }

    const formData = {
      focalLength,
      altitude,
      widthSegments,
      mirrorSide,
      crosshairSize,
      crosshairOpacity,
      crosshairColor,
      imageMetadata: metadata, // Include extracted metadata from images
    };

    try {
      const response = await fetch("http://your-backend-url.com/submit-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setMessage(data.message || "Form submitted successfully!");
    } catch (error) {
      console.error("Error submitting form:", error);
      setMessage("Error submitting form. Please try again.");
    }
  };

  return (
    <div className="sidebar">
      <div className="upload-section">
        <label className="upload-button" htmlFor="image-upload">
          📄 Add Image
          <input type="file" id="image-upload" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
        </label>
      </div>

      <div className="input-group">
        <label>Focal Length (mm)</label>
        <input type="number" value={focalLength} onChange={(e) => setFocalLength(e.target.value)} />
      </div>

      <div className="input-group">
        <label>Altitude (m)</label>
        <input type="number" value={altitude} onChange={(e) => setAltitude(e.target.value)} />
      </div>

      <div className="input-group">
        <label># Width Segments</label>
        <input type="number" value={widthSegments} onChange={(e) => setWidthSegments(e.target.value)} />
      </div>

      <div className="input-group">
        <label>Mirror Side</label>
        <select value={mirrorSide} onChange={(e) => setMirrorSide(e.target.value)}>
          <option value="None">None</option>
          <option value="Side A">Side A</option>
          <option value="Side B">Side B</option>
        </select>
      </div>

      <div className="input-group">
        <label>Crosshair Size</label>
        <input
          type="range"
          min="0"
          max="100"
          value={crosshairSize}
          onChange={(e) => setCrosshairSize(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Crosshair Opacity</label>
        <input
          type="range"
          min="0"
          max="100"
          value={crosshairOpacity}
          onChange={(e) => setCrosshairOpacity(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Crosshair Color</label>
        <input
          type="color"
          value={crosshairColor}
          onChange={(e) => setCrosshairColor(e.target.value)}
          className="color-picker"
        />
      </div>

      {/* ✅ Moved buttons OUTSIDE of <form> to restore original placement */}
      <div className="button-group">
        <button className="submit-button" onClick={handleSubmit}>Submit</button>
        <button className="export-button">Export 📤</button>
      </div>

      {message && <p className="response-message">{message}</p>}
    </div>
  );
}
