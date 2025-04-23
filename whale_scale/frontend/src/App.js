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
    altitude: "",
    altitudeOffset: "",
    imageWidth: "",
    imageHeight: "",
    focalLength: "",
    fieldOfView: "",
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
  const [pixelStatusMessage, setPixelStatusMessage] = useState("")
  const [measurementResults, setMeasurementResults] = useState(null)
  const [subjectName, setSubjectName] = useState("")
  const [originalFilePath, setOriginalFilePath] = useState("");
  const [selectedData, setSelectedData] = useState([]);

  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
  

  const handleBackendResult = (result) => {
    const finalResult = {
      ...result,
      user_image_path: originalFilePath || image,  // fallback to blob URL if missing
    };
    setMeasurementResults(finalResult);
  
    fetch("/api/measurements/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken")  // Use your CSRF helper
      },
      credentials: "include",
      body: JSON.stringify(finalResult),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to save measurement");
        }
        return res.json();
      })
      .then((data) => {
        console.log("Measurement saved:", data);
      })
      .catch((error) => {
        console.error("Error saving measurement:", error);
      });
  };
  

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleImageUpload = async (file) => {
    if (!(file instanceof File)) {
      console.error("handleImageUpload expected a File but got:", file)
      return
    }
  
    const imageUrl = URL.createObjectURL(file)
    setImage(imageUrl)
    setOriginalFilePath(file.name);
  
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("image", file)
  
      const response = await fetch("/api/collatrix/extract_metadata/", {
        method: "POST",
        body: formDataToSend,
      })
  
      if (response.ok) {
        const backendMetadata = await response.json()
        console.log("Backend Metadata:", backendMetadata)
  
        const newMetadata = {
          focalLength: backendMetadata.focal_length_mm || "",
          altitude: backendMetadata.gps_altitude_m || "",
          imageWidth: backendMetadata.image_width || "",
          imageHeight: backendMetadata.image_height || "",
          fieldOfView: backendMetadata.field_of_view_deg || "",
          sensorWidth: backendMetadata.sensor_width || "",
        }
  
        setMetadata(newMetadata)
  
        setFormData((prev) => ({
          ...prev,
          focalLength: newMetadata.focalLength,
          altitude: newMetadata.altitude,
          imageWidth: newMetadata.imageWidth,
          imageHeight: newMetadata.imageHeight,
          fieldOfView: newMetadata.fieldOfView,
          sensorWidth: newMetadata.sensorWidth,
        }))

        await computePixelDimension({ ...formData, ...newMetadata }, newMetadata)
      } else {
        console.error("Failed to extract metadata from backend")
      }
    } catch (err) {
      console.error("Error calling extract_metadata:", err)
    }
  }

  const computePixelDimension = async (customFormData = formData, customMetadata = metadata) => {
    try {
      if (!customFormData.altitudeOffset) {
        customFormData.altitudeOffset = 0
      }
      const payload = {
        altitude: parseFloat(customFormData.altitude) + parseFloat(customFormData.altitudeOffset),
        focal_length: parseFloat(customFormData.focalLength),
        image_width: parseInt(customMetadata.image_width || customFormData.imageWidth),
        fov: parseFloat(customMetadata.fov || customFormData.fieldOfView),
        sensor_width: parseFloat(customFormData.sensorWidth),
      }
  
      const response = await fetch("/api/collatrix/compute_pixel_dimension/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
  
      const result = await response.json()
  
      if (!response.ok) {
        throw new Error(result.error || "Failed to compute pixel dimension.")
      }
  
      setPixelDimension(result.pixel_dimension)
      setPixelStatusMessage("✅ All Required Data Completed")
    } catch (err) {
      setPixelStatusMessage(`❗ ${err.message}`)
    }
  }
  

  const handleSubmit = () => {
    console.log("Form submitted:", formData)
    computePixelDimension()
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
            pixelStatusMessage={pixelStatusMessage}
          />
        )
      case "statistics":
        return <StatisticsSidebar />
      case "data":
        return <DataSidebar selectedData={selectedData} />
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
            numSegments={formData.numSegments}
            pixelDimension={pixelDimension}
            onBackendResult={handleBackendResult}
            subjectName={subjectName}
            setSubjectName={setSubjectName}
            formData={formData}
          />
        )
      case "statistics":
        return <Statistics />
      case "data":
        return <Data onSelectedDataChange={setSelectedData} />
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
