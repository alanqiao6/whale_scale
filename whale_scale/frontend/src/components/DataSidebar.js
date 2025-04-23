import React from "react";
import "./Sidebar.css";

export default function DataSidebar() {
  return (
    <div className="sidebar">
      <h2>Data</h2>
      <h3>Select the data rows and the type of computation</h3>

      <button className="update-button">Run</button>
      <button className="update-button">Export</button>
    </div>
  );
}
