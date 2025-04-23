"use client"
import React, { useState } from "react"
import TopBar from "./components/TopBar"
import MeasurementSidebar from "./components/MeasurementSidebar"
import StatisticsSidebar from "./components/StatisticsSidebar"
import DataSidebar from "./components/DataSidebar"
import Measurement from "./pages/Measurement"
import Statistics from "./pages/Statistics"
import Data from "./pages/Data"
import "./App.css"

export default function App() {
  const [activeTab, setActiveTab] = useState("measure")

  // Shared state (used by sidebar + main content)
  const [formData, setFormData] = useState({
    altitude: "20",
    altitudeOffset: "1",
    imageWidth: "8064",
    imageHeight: "6048",
    focalLength: "19.35",
    fieldOfView: "28.842",
    sensorWidth: "",
    numSegments: "5",
    crosshairSize: "10",
    crosshairOpacity: "1",
    segmentColor: "#ffa500"
  })
  const [image, setImage] = useState(null)
  const [metadata, setMetadata] = useState({})
  const [pixelDimension, setPixelDimension] = useState(null)
  const [activeTool, setActiveTool] = useState("Measure Widths")

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleImageUpload = (file) => {
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    console.log("Form submitted:", formData)
  }

  const renderSidebar = () => {
    switch (activeTab) {
      case "measure":
        return (
          <MeasurementSidebar
            metadata={metadata}
            formData={formData}
            onImageUpload={handleImageUpload}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
          />
        )
      case "statistics":
        return <StatisticsSidebar />
      case "data":
        return <DataSidebar />
      default:
        return null
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case "measure":
        return (
          <Measurement
            image={image}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            onImageUpload={handleImageUpload}
            metadata={metadata}
            segmentColor={formData.segmentColor}
            crosshairSize={parseInt(formData.crosshairSize) || 10}
            pixelDimension={pixelDimension}
          />
        )
      case "statistics":
        return <Statistics />
      case "data":
        return <Data />
      default:
        return <h2>Page not found</h2>
    }
  }

  return (
    <div className="app-container">
      {renderSidebar()}
      <div className="content-container">
        <TopBar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="main-content">{renderContent()}</div>
      </div>
    </div>
  )
}
