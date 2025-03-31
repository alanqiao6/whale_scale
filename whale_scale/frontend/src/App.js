"use client"
import React, { useState } from "react"
import Sidebar from "./components/Sidebar"
import TopBar from "./components/TopBar"
import ImageViewer from "./components/ImageViewer"
import Data from "./components/Data"
import * as exifr from "exifr"
import "./App.css"

export default function App() {
  const [activeTab, setActiveTab] = useState("measure")
  const [activeTool, setActiveTool] = useState(null)
  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [metadata, setMetadata] = useState({ focalLength: "", altitude: "" })
  const [formData, setFormData] = useState(null)
  const [widthSegments, setWidthSegments] = useState(10)
  const [measurementData, setMeasurementData] = useState(null)

  const handleImageUpload = async (file) => {
    if (file) {
      const imageUrl = URL.createObjectURL(file)
      setImage(imageUrl)
      setImageFile(file)

      try {
        const exifData = await exifr.parse(file)
        console.log("Extracted Metadata:", exifData)

        setMetadata({
          focalLength: exifData?.FocalLength || "",
          altitude: exifData?.GPSAltitude || "",
        })

        // Also try to extract metadata using backend
        const formData = new FormData()
        formData.append("image", file)

        const response = await fetch("/collatrix/extract-metadata/", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const backendMetadata = await response.json()
          console.log("Backend Metadata:", backendMetadata)

          setMetadata((prev) => ({
            focalLength: prev.focalLength || backendMetadata.focalLength || "",
            altitude: prev.altitude || backendMetadata.altitude || "",
          }))
        }
      } catch (error) {
        console.error("Error extracting metadata:", error)
      }
    }
  }

  const handleMeasurementUpdate = (data) => {
    setMeasurementData(data)
  }

  const handleSubmit = async (dataFromSidebar) => {
    setFormData(dataFromSidebar)
    setWidthSegments(Number.parseInt(dataFromSidebar.widthSegments) || 10)

    // Submit measurement to backend
    if (!measurementData || measurementData.points.length < 2) {
      console.error("Not enough points to submit a measurement.")
      return
    }

    try {
      const response = await fetch("/morphometrix/calculate_length/", {
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

  return (
    <div className="app-container">
      <Sidebar
        metadata={metadata}
        onImageUpload={handleImageUpload}
        onSubmit={handleSubmit}
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
        />
        <Data formData={formData} measurementData={measurementData} />
      </div>
    </div>
  )
}
