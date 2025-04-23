import React from "react";
import "./Sidebar.css";

export default function MeasurementSidebar({ metadata, formData, onImageUpload, onInputChange, onSubmit }) {
  return (
    <div className="sidebar">
      <h2>Measure</h2>
      <button onClick={() => document.getElementById("image-upload").click()}>Upload Image</button>
      <input
        id="image-upload"
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onImageUpload}
      />

      {[
        "altitude",
        "altitudeOffset",
        "imageWidth",
        "imageHeight",
        "focalLength",
        "fieldOfView",
        "sensorWidth",
        "numSegments",
        "crosshairSize",
        "crosshairOpacity"
      ].map((key) => (
        <div key={key}>
          <label>{key.replace(/([A-Z])/g, " $1")} ({key === "sensorWidth" ? "optional" : ""})</label>
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
    </div>
  );
}
