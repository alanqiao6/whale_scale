import React from "react";
import "./ToolBar.css";

const tools = [
  "Measure Widths",
  "Measure Area",
  "Measure Angle",
  "Measure Curve",
];

export default function ToolBar({ activeTool, setActiveTool, measurementName, setMeasurementName }) {
  return (
    <div className="tool-bar">
      <input
        type="text"
        placeholder="Enter measurement name"
        value={measurementName}
        onChange={(e) => setMeasurementName(e.target.value)}
        style={{
          padding: "6px",
          marginRight: "10px",
          borderRadius: "4px",
          border: "1px solid #ccc"
        }}
      />
      {tools.map((tool) => (
        <button
          key={tool}
          className={activeTool === tool ? "active" : ""}
          onClick={() => setActiveTool(tool)}
        >
          {tool}
        </button>
      ))}
    </div>
  );
}
