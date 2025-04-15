"use client"
import React, { useState } from "react"
import Sidebar from "./components/Sidebar"
import TopBar from "./components/TopBar"
import ImageViewer from "./components/ImageViewer"
import Data from "./components/Data"
import "./App.css"
import * as exifr from "exifr"

export default function App() {
  const [activeTab, setActiveTab] = useState("measure")
  const [activeTool, setActiveTool] = useState(null)
  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [metadata, setMetadata] = useState({ focalLength: "", altitude: "" })
  const [formData, setFormData] = useState({
    focalLength: "",
    altitude: "",
    widthSegments: "",
    crosshairSize: 50,
    crosshairOpacity: 100,
    segmentColor: "#FFFFC5"
  })
  const [widthSegments, setWidthSegments] = useState(null)
  const [rulerData, setRulerData] = useState(null)
  const [manualCurveData, setManualCurveData] = useState(null)
  const [areaData, setAreaData] = useState(null)
  const [backendResult, setBackendResult] = useState(null)
  const [backendMessage, setBackendMessage] = useState("")

  // Handle real-time input changes from Sidebar
  const handleInputChange = (name, value) => {
    // Update formData state
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // For width segments, also update the specific state
    if (name === "widthSegments") {
      setWidthSegments(value !== "" ? Number.parseInt(value) : null)
    }
    
    // For metadata fields, update the metadata state
    if (name === "focalLength" || name === "altitude") {
      setMetadata(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleImageUpload = async (file) => {
    if (file) {
      const imageUrl = URL.createObjectURL(file)
      setImage(imageUrl)
      setImageFile(file)

      try {
        const formData = new FormData()
        formData.append("image", file)

        const response = await fetch("/api/collatrix/extract_metadata/", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const backendMetadata = await response.json()
          console.log("Backend Metadata:", backendMetadata)

          const newMetadata = {
            focalLength: backendMetadata.focal_length_mm || "",
            altitude: backendMetadata.gps_altitude_m || "",
          }

          setMetadata(newMetadata)
          
          // Also update these values in formData
          setFormData(prev => ({
            ...prev,
            focalLength: newMetadata.focalLength,
            altitude: newMetadata.altitude
          }))
        } 
      } catch (error) {
        console.error("Error extracting metadata via backend:", error)
        // Still try client-side extraction if server throws error
      } 
    }
  }

  const [measurementData, setMeasurementData] = useState(null)

  const handleMeasurementUpdate = (data) => {
    setMeasurementData(data)
  }

  const handleSubmit = async (dataFromSidebar) => {
    // We already have updated formData from input changes, 
    // but this ensures consistency
    setFormData(dataFromSidebar)
    
    // No need to set width segments here as it's already set via handleInputChange
    // But we'll keep it for safety
    if (dataFromSidebar.widthSegments !== formData.widthSegments) {
      setWidthSegments(Number.parseInt(dataFromSidebar.widthSegments) || null)
    }

    // Update metadata with form data
    setMetadata({
      focalLength: dataFromSidebar.focalLength,
      altitude: dataFromSidebar.altitude,
    })

    // Submit measurement to backend
    if (!measurementData || measurementData.points.length < 2) {
      console.error("Not enough points to submit a measurement.")
      return
    }

    try {
      const response = await fetch("/api/morphometrix/calculate_length/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          measurement: {
            measurement_type: "line",
            measurement_name: "User Line",
            objects_params: [
              {
                type: 1,
                parms: {
                  x1: measurementData.points[0].x,
                  y1: measurementData.points[0].y,
                  x2: measurementData.points[1].x,
                  y2: measurementData.points[1].y,
                  length: measurementData.length,
                },
              },
            ],
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Line measurement result:", result)
      } else {
        console.error("Measurement submission failed:", response.statusText)
      }
    } catch (error) {
      console.error("Error submitting measurement:", error)
    }
  }

  const handleBackendResult = (result) => {
    setBackendResult(result)

    if (result.type === "manual_curve") {
      setManualCurveData({
        type: "manual_curve",
        curveLength: result.length,
        curvePoints: result.curvePoints,
      })
    } else if (result.type === "ruler") {
      setRulerData({
        type: "ruler",
        curveLength: result.curveLength,
        widthSegments: result.widthSegments ?? [],
        // Use the user-specified number rather than array length
        segments: Number.parseInt(formData.widthSegments) || result.widthSegments?.length || 0,
      })
    } else if (result.type === "area") {
      setAreaData({
        type: "area",
        area: result.area,
        polygonPoints: result.polygonPoints,
      })
    }
  }

  return (
    <div className="app-container">
      <Sidebar 
        metadata={metadata} 
        formData={formData}
        onImageUpload={handleImageUpload} 
        onSubmit={handleSubmit}
        onInputChange={handleInputChange}
      />
      <div className="main-content">
        <TopBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
        />
        <ImageViewer
          image={image}
          widthSegments={widthSegments}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onMeasurementUpdate={handleMeasurementUpdate}
          onImageUpload={handleImageUpload}
          onBackendResult={handleBackendResult}
          metadata={metadata}
          segmentColor={formData.segmentColor}
        />
        {backendMessage && (
          <p style={{ textAlign: "center", color: "white", fontWeight: "bold", marginTop: "10px" }}>{backendMessage}</p>
        )}

        <Data formData={formData} rulerData={rulerData} manualCurveData={manualCurveData} areaData={areaData} />
      </div>
    </div>
  )
}