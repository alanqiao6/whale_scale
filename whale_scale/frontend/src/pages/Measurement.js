import React from "react"
import ToolBar from "../components/ToolBar"
import ImageViewer from "../components/ImageViewer"
import "../App.css"

export default function Measurement({
  image,
  activeTool,
  setActiveTool,
  onImageUpload,
  metadata,
  segmentColor,
  crosshairSize,
  numSegments,
  pixelDimension,
  onBackendResult,
  measurementName,
  setMeasurementName,
  formData
}) {
  return (
    <div className="app-container">
      <div className="main-content">
        <ToolBar activeTool={activeTool} setActiveTool={setActiveTool} measurementName={measurementName} setMeasurementName={setMeasurementName}/>
        <ImageViewer
          image={image}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onImageUpload={onImageUpload}
          metadata={metadata}
          segmentColor={segmentColor}
          crosshairSize={crosshairSize}
          numSegments={numSegments}
          pixelDimension={pixelDimension}
          onBackendResult={onBackendResult}
          measurementName={measurementName}
          formData={formData}
        />
      </div>
    </div>
  )
}
