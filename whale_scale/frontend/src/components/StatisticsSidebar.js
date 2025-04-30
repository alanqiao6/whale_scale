// Author: Jason Fitzpatrick
import React from "react";
import "./Sidebar.css";

export default function StatisticsSidebar() {
  return (
    <div className="sidebar">
      <h2>Statistics</h2>
      <h3>Select the data to view</h3>

      <button className="update-button">Update</button>
    </div>
  );
}
