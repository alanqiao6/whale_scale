import React from "react"
import "./Sidebar.css"

export default function MeasurementSidebar({ metadata, formData, onImageUpload, onInputChange, onSubmit, pixelStatusMessage }) {
  const labels = {
    altitude: "Altitude (m)",
    altitudeOffset: "Altitude Offset (m)",
    imageWidth: "Image Width (px)",
    imageHeight: "Image Height (px)",
    focalLength: "Focal Length (mm)",
    fieldOfView: "Field of View (deg)",
    sensorWidth: "Sensor Width (mm)",
    numSegments: "Segment Count",
    crosshairSize: "Crosshair Size",
    crosshairOpacity: "Crosshair Opacity",
  }

  return (
    <div className="sidebar">
      <h2>Measure</h2>
      <button onClick={() => document.getElementById("image-upload").click()}>
        Upload Image
      </button>
      <input
        id="image-upload"
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onImageUpload(file)
        }}
      />

      {Object.keys(labels).map((key) => (
        <div key={key}>
          <label>{labels[key]}</label>
          <input
            type="text"
            name={key}
            value={formData[key] || ""}
            onChange={onInputChange}
          />
        </div>
      ))}

      <label>Line Color</label>
      <input
        type="color"
        name="segmentColor"
        value={formData.segmentColor}
        onChange={onInputChange}
      />

      <button className="update-button" onClick={onSubmit}>Update</button>
      {pixelStatusMessage && (
        <p style={{ marginTop: "1rem", color: pixelStatusMessage.startsWith("✅") ? "green" : "red" }}>
          {pixelStatusMessage}
        </p>
      )}
    </div>
  )
}
