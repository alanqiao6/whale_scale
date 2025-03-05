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
        <label className="upload-button" htmlFor="image-upload" tabIndex="0" aria-label="Upload an image"   onKeyDown={(e) => {
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
        <input type="number" id="focal-length" value={focalLength} onChange={(e) => setFocalLength(e.target.value)} aria-required="true" />
      </div>

      <div className="input-group">
        <label>Altitude (m)</label>
        <input type="number" id="altitude" value={altitude} onChange={(e) => setAltitude(e.target.value)} aria-required="true" />
      </div>

      <div className="input-group">
        <label># Width Segments</label>
        <input type="number" id="width-segments" value={widthSegments} onChange={(e) => setWidthSegments(e.target.value)} />
      </div>

      <div className="input-group">
        <label>Mirror Side</label>
        <select id="mirror-side" value={mirrorSide} onChange={(e) => setMirrorSide(e.target.value)} aria-describedby="mirror-desc">
          <option value="None">None</option>
          <option value="Side A">Side A</option>
          <option value="Side B">Side B</option>
        </select>
        <p id="mirror-desc" className="sr-only">Select a mirror side for processing.</p>
      </div>

      <div className="input-group">
        <label htmlFor="crosshair-size">Crosshair Size</label>
        <input
          type="range"
          id="crosshair-size"
          min="0"
          max="100"
          value={crosshairSize}
          onChange={(e) => setCrosshairSize(e.target.value)}
          aria-valuenow={crosshairSize}
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
          value={crosshairOpacity}
          onChange={(e) => setCrosshairOpacity(e.target.value)}
          aria-valuenow={crosshairOpacity}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Adjust crosshair opacity"
        />
      </div>

      <div className="input-group">
        <label htmlFor="crosshair-color">Crosshair Color</label>
        <input
          type="color"
          id="crosshair-color"
          value={crosshairColor}
          onChange={(e) => setCrosshairColor(e.target.value)}
          className="color-picker"
          aria-label="Select crosshair color"
        />
      </div>

      {/* ✅ Moved buttons OUTSIDE of <form> to restore original placement */}
      <div className="button-group">
        <button className="submit-button" onClick={handleSubmit} aria-label="Submit the form">Submit</button>
        <button className="export-button" aria-label="Export data">Export 📤</button>
      </div>

      {message && <p className="response-message" aria-live="polite">{message}</p>}
    </div>
  );
}
