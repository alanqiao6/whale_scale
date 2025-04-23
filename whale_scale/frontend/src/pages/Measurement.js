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
  pixelDimension
}) {
  return (
    <div className="app-container">
      <div className="main-content">
        <ToolBar activeTool={activeTool} setActiveTool={setActiveTool} />
        <ImageViewer
          image={image}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onImageUpload={onImageUpload}
          metadata={metadata}
          segmentColor={segmentColor}
          crosshairSize={crosshairSize}
          pixelDimension={pixelDimension}
        />
      </div>
    </div>
  )
}
