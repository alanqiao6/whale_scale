import React from "react";
import "./ToolBar.css";

// Tool value → Emoji label
const toolLabels = {
  "Measure Widths": "📏 Measure Widths",
  "Measure Area": "🔲 Measure Area",
  "Measure Angle": "📐 Measure Angle",
  "Measure Curve": "✏️ Measure Curve",
};

const tools = Object.keys(toolLabels);

export default function ToolBar({ activeTool, setActiveTool, subjectName, setSubjectName }) {
  return (
    <div className="tool-bar">
      <input
        type="text"
        placeholder="Enter a subject name"
        value={subjectName}
        onChange={(e) => setSubjectName(e.target.value)}
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
          {toolLabels[tool]}
        </button>
      ))}
    </div>
  );
}
