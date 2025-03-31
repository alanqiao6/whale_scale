"use client"

import React, { useState, useEffect, useRef } from "react"
import "./ImageViewer.css"

export default function ImageViewer({
  image,
  widthSegments,
  activeTool,
  setActiveTool,
  onMeasurementUpdate,
  onImageUpload,
}) {
  const canvasRef = useRef(null)
  const [points, setPoints] = useState([])
  const [mainLine, setMainLine] = useState(null)
  const [segmentLines, setSegmentLines] = useState([])

  // Reset state when switching tools
  useEffect(() => {
    if (activeTool !== "ruler") {
      setPoints([])
      setMainLine(null)
      setSegmentLines([])
    }
  }, [activeTool])

  // Main draw effect: redraw image and overlay anytime anything changes
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas || !image) return

      const ctx = canvas.getContext("2d")
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        drawOverlay(ctx)
      }

      img.src = image
    }

    draw()
  }, [image, points, mainLine, segmentLines])

  // When 2 points are selected, calculate main line and segments
  useEffect(() => {
    if (points.length === 2) {
      const line = {
        x1: points[0].x,
        y1: points[0].y,
        x2: points[1].x,
        y2: points[1].y,
      }

      setMainLine(line)
      calculateSegmentLines(line, widthSegments)

      const length = Math.hypot(line.x2 - line.x1, line.y2 - line.y1)
      if (onMeasurementUpdate) {
        onMeasurementUpdate({
          type: "length",
          points,
          length,
          segments: widthSegments,
        })
      }
      

      setActiveTool(null) // deactivate tool after measuring
    }
  }, [points])

  const handleCanvasClick = (e) => {
    if (activeTool !== "ruler") return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (points.length >= 2) {
      setPoints([{ x, y }])
      setMainLine(null)
      setSegmentLines([])
    } else {
      setPoints((prev) => [...prev, { x, y }])
    }
  }

  const calculateSegmentLines = (line, numSegments) => {
    if (!line || numSegments < 2) return

    const { x1, y1, x2, y2 } = line
    const segments = []
    const lineLength = Math.hypot(x2 - x1, y2 - y1)
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const perpAngle = angle + Math.PI / 2
    const perpLength = lineLength / 4

    for (let i = 1; i < numSegments; i++) {
      const ratio = i / numSegments
      const segX = x1 + (x2 - x1) * ratio
      const segY = y1 + (y2 - y1) * ratio

      const perpX1 = segX + perpLength * Math.cos(perpAngle)
      const perpY1 = segY + perpLength * Math.sin(perpAngle)
      const perpX2 = segX - perpLength * Math.cos(perpAngle)
      const perpY2 = segY - perpLength * Math.sin(perpAngle)

      segments.push({ x1: perpX1, y1: perpY1, x2: perpX2, y2: perpY2 })
    }

    setSegmentLines(segments)
  }

  const drawOverlay = (ctx) => {
    // Draw red points
    points.forEach((point) => {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI)
      ctx.fillStyle = "red"
      ctx.strokeStyle = "white"
      ctx.lineWidth = 2
      ctx.fill()
      ctx.stroke()
    })

    // Draw main line
    if (mainLine) {
      ctx.beginPath()
      ctx.moveTo(mainLine.x1, mainLine.y1)
      ctx.lineTo(mainLine.x2, mainLine.y2)
      ctx.strokeStyle = "blue"
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Draw green segment lines
    segmentLines.forEach((line) => {
      ctx.beginPath()
      ctx.moveTo(line.x1, line.y1)
      ctx.lineTo(line.x2, line.y2)
      ctx.strokeStyle = "green"
      ctx.lineWidth = 1
      ctx.stroke()
    })
  }

  return (
    <div className="image-container">
      {image ? (
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`image-canvas ${activeTool === "ruler" ? "ruler-active" : ""}`}
        />
      ) : (
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
      )}

      {activeTool === "ruler" && (
        <div className="drawing-instructions">
          {points.length === 0 ? "Click to place the first point" : "Click to place the second point"}
        </div>
      )}
    </div>
  )
}
