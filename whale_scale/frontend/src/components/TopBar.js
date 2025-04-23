import React from "react"
import "./TopBar.css"

export default function TopBar({ activeTab, setActiveTab }) {
  const tabs = ["measure", "statistics", "data"]

  return (
    <div className="top-bar">
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="logout">
        <button onClick={() => alert("Logging out...")}>Logout</button>
      </div>
    </div>
  )
}
