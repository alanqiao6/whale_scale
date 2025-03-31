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

        // Also try to extract metadata using the backend
        const formData = new FormData()
        formData.append("image", file)

        try {
          const response = await fetch("/api/collatrix/extract-metadata/", {
            method: "POST",
            body: formData,
          })

          if (response.ok) {
            const backendMetadata = await response.json()
            console.log("Backend Metadata:", backendMetadata)

            // Update metadata with backend values if available
            setMetadata((prev) => ({
              focalLength: prev.focalLength || backendMetadata.focalLength || "",
              altitude: prev.altitude || backendMetadata.altitude || "",
            }))
          }
        } catch (error) {
          console.error("Error fetching metadata from backend:", error)
        }
      } catch (error) {
        console.error("Error extracting metadata:", error)
      }
    }
  }

  const handleSubmit = async (data) => {
    setFormData(data)
    setWidthSegments(Number.parseInt(data.widthSegments) || 10)

    const formDataToSend = new FormData()

    if (imageFile) {
      formDataToSend.append("image", imageFile)
    }

    Object.keys(data).forEach((key) => {
      formDataToSend.append(key, data[key])
    })

    // If we have measurement data, add it to the form
    if (measurementData) {
      formDataToSend.append("measurement_data", JSON.stringify(measurementData))
    }

    try {
      const response = await fetch("/api/morphometrix/submit/", {
        method: "POST",
        body: formDataToSend,
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Submission successful:", result)
      } else {
        console.error("Submission failed:", response.statusText)
      }
    } catch (error) {
      console.error("Error submitting form:", error)
    }
  }

  const handleMeasurementUpdate = (data) => {
    setMeasurementData(data)
  }

  return (
    <div className="app-container">
      <Sidebar metadata={metadata} onImageUpload={handleImageUpload} onSubmit={handleSubmit} />
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

