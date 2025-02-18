import "./TopBar.css"

export default function TopBar({ activeTab, setActiveTab }) {
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
        <button className="tool-button">🗨️</button>
        <button className="tool-button">✏️</button>
        <button className="tool-button">📏</button>
        <button className="tool-button">❓</button>
      </div>
    </div>
  )
}

