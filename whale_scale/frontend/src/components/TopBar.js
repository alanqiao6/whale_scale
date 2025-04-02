"use client"
import "./TopBar.css"
import React from "react"

export default function TopBar({ activeTab, setActiveTab, activeTool, setActiveTool }) {
  return (
    <div className="top-bar">
      <div className="tabs">
        <button className={`tab ${activeTab === "measure" ? "active" : ""}`} onClick={() => setActiveTab("measure")}>
          Measure
        </button>
        <button
          className={`tab ${activeTab === "xcertainty" ? "active" : ""}`}
          onClick={() => setActiveTab("xcertainty")}
        >
          Xcertainty
        </button>
      </div>
      <div className="tools">
        <button
          className={`tool-button ${activeTool === "ruler" ? "active" : ""}`}
          onClick={() => setActiveTool(activeTool === "ruler" ? null : "ruler")}
          title="Measure Length"
        >
          📏
        </button>
        <button className="tool-button" title="Comment">
          🗨️
        </button>
        <button
        className={`tool-button ${activeTool === "pencil" ? "active" : ""}`}
        onClick={() => setActiveTool(activeTool === "pencil" ? null : "pencil")}
        title="Draw"
      >
        ✏️
      </button>
      <button
          className={`tool-button ${activeTool === "area" ? "active" : ""}`}
          onClick={() => setActiveTool(activeTool === "area" ? null : "area")}
          title="Measure Area"
        >
          🔲
        </button>
        <button className="tool-button" title="Help">
          ❓
        </button>
      </div>
    </div>
  )
}

