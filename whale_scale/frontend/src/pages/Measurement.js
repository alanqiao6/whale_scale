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
  subjectName,
  setSubjectName,
  formData
}) {
  return (
    <div className="app-container">
      <div className="main-content">
        <ToolBar activeTool={activeTool} setActiveTool={setActiveTool} subjectName={subjectName} setSubjectName={setSubjectName}/>
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
          subjectName={subjectName}
          formData={formData}
        />
      </div>
    </div>
  )
}
