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
  const [formData, setFormData] = useState(null)
  const [widthSegments, setWidthSegments] = useState(null)
  const [rulerData, setRulerData] = useState(null)
  const [manualCurveData, setManualCurveData] = useState(null)
  const [areaData, setAreaData] = useState(null)
  const [backendResult, setBackendResult] = useState(null)
  const [backendMessage, setBackendMessage] = useState("")

  const handleImageUpload = async (file) => {
    if (file) {
      const imageUrl = URL.createObjectURL(file)
      setImage(imageUrl)
      setImageFile(file)

      try {
        const formData = new FormData()
        formData.append("image", file)

        const response = await fetch("/collatrix/extract-metadata/", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const backendMetadata = await response.json()
          console.log("Backend Metadata:", backendMetadata)

          setMetadata({
            focalLength: backendMetadata.focal_length_mm || "",
            altitude: backendMetadata.gps_altitude_m || "",
          })
        } else {
          // If server fails, try client-side extraction with exifr
          console.log("Falling back to client-side extraction")
          const exifrData = await exifr.parse(file)
          console.log("Exifr Metadata:", exifrData)

          setMetadata({
            focalLength: exifrData?.FocalLength || "",
            altitude: exifrData?.GPSAltitude || "",
          })
        }
      } catch (error) {
        console.error("Error extracting metadata:", error)
        // Still try client-side extraction if server throws error
        try {
          const exifrData = await exifr.parse(file)
          console.log("Exifr Metadata:", exifrData)

          setMetadata({
            focalLength: exifrData?.FocalLength || "",
            altitude: exifrData?.GPSAltitude || "",
          })
        } catch (exifrError) {
          console.error("Client-side extraction also failed:", exifrError)
        }
      }
    }
  }

  const [measurementData, setMeasurementData] = useState(null)

  const handleMeasurementUpdate = (data) => {
    setMeasurementData(data)
  }

  const handleSubmit = async (dataFromSidebar) => {
    setFormData(dataFromSidebar)
    setWidthSegments(Number.parseInt(dataFromSidebar.widthSegments))

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
            segments: result.widthSegments?.length ?? 0,
        })
    } else if (result.type === "area") {
        setAreaData({
            type: "area",
            area: result.area,
            polygonPoints: result.polygonPoints,
        })
    }
  }

  const handleFinalizeManualCurve = async () => {
    if (manualCurvePoints.length < 2) return

    const payload = {
        measurement_stack: [  // Note: measurement_stack not measurement
            {
                measurement_type: "CURVE",  // Note: uppercase CURVE
                name: "manual_curve",       // Note: name not measurement_name
                objects_params: manualCurvePoints.map((p) => ({
                    type: "POINTITEM",      // Note: POINTITEM as string
                    parms: { x: p.x, y: p.y },
                })),
            },
        ],
    }

    try {
        const response = await fetch("/morphometrix/calculate_curve/", {  // Note: underscore
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })

        // ... rest of the function stays the same
    } catch (err) {
        setBackendMessage("❗ Error connecting to backend for manual curve")
    }
  }

  const handleFinalizeRuler = async () => {
    try {
        const payload = {
            measurement_stack: [  // Note: measurement_stack not measurement
                {
                    measurement_type: "CURVE",
                    name: "curve_from_crosshairs",
                    objects_params: crosshairs.map((pair) => ({
                        type: "POINTITEM",
                        parms: {
                            x: (pair.left.x + pair.right.x) / 2,
                            y: (pair.left.y + pair.right.y) / 2,
                        },
                    })),
                },
            ],
        }

        const curveRes = await fetch("/morphometrix/calculate_curve/", {  // Note: underscore
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })

        // ... rest of the function stays the same
    } catch (err) {
        setBackendMessage("❗ Error connecting to backend for ruler")
    }
  }

  const handleFinalizeArea = async () => {
    if (polygonPoints.length < 3) {
        setBackendMessage("❗ Need at least 3 points for area calculation")
        return
    }

    try {
        const payload = {
            measurement: {  // Note: this one uses measurement not measurement_stack
                measurement_type: "AREA",
                name: "Polygon Area",
                objects_params: [
                    {
                        type: 5,
                        parms: polygonPoints.map((p) => ({ x: p.x, y: p.y }))
                    },
                ],
            },
        }

        const response = await fetch("/morphometrix/calculate_area/", {  // Note: underscore
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })

        // ... rest of the function stays the same
    } catch (err) {
        console.error(err)
        setBackendMessage("❗ Error connecting to backend for area calculation")
    }
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
          onBackendResult={handleBackendResult}
          metadata={metadata}
        />
        {backendMessage && (
          <p style={{ textAlign: "center", color: "white", fontWeight: "bold", marginTop: "10px" }}>{backendMessage}</p>
        )}

        <Data formData={formData} rulerData={rulerData} manualCurveData={manualCurveData} areaData={areaData} />
      </div>
    </div>
  )
}