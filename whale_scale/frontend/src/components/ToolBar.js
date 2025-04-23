import React from "react";
import "./ToolBar.css";

const tools = [
  "Measure Widths",
  "Measure Widths (Curved)",
  "Measure Area",
  "Measure Angle",
  "Measure Curve",
  "Measure Line"
];

export default function ToolBar({ activeTool, setActiveTool }) {
  return (
    <div className="tool-bar">
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
