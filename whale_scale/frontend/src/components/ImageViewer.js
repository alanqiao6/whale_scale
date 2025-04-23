import React from "react"
import "./ImageViewer.css"

export default function ImageViewer({
  image,
  activeTool,
  setActiveTool,
  onImageUpload,
  metadata,
  segmentColor,
  crosshairSize,
  pixelDimension,
}) {
  return (
    <div className="image-viewer">
      {!image ? (
        <label htmlFor="image-upload" className="upload-label">
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0]
              if (file) onImageUpload(file)
            }}
            hidden
          />
          <div
            className="upload-area"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file) onImageUpload(file)
            }}
          >
            <img
              src="https://png.pngtree.com/png-clipart/20221117/ourmid/pngtree-cute-cartoon-whale-png-image_6461281.png"
              alt="Upload Preview"
              className="upload-placeholder"
            />
            <img
              src="https://static-00.iconduck.com/assets.00/upload-icon-2048x2048-eu9n5hco.png"
              alt="Upload"
              className="second-image"
            />
            <p className="upload-text">Upload image here or drag file here</p>
          </div>
        </label>
      ) : (
        <>
          <img src={image} alt="Whale" className="whale-image" />
          {/* Your future overlays can go here */}
        </>
      )}
      <div className="buttons-bottom-right">
        <button className="save-button">SAVE</button>
        <button className="clear-button">CLEAR</button>
      </div>
    </div>
  )
}
