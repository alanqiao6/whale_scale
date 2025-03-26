"use client"

import React, { useState, useEffect, useRef } from "react"
import "./ImageViewer.css"

export default function ImageViewer({ image, widthSegments, activeTool, setActiveTool, onMeasurementUpdate }) {
  const canvasRef = useRef(null)
  const [points, setPoints] = useState([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [mainLine, setMainLine] = useState(null)
  const [segmentLines, setSegmentLines] = useState([])

  // Reset points when tool changes
  useEffect(() => {
    if (activeTool !== "ruler") {
      setPoints([])
      setMainLine(null)
      setSegmentLines([])
      setIsDrawing(false)
    }
  }, [activeTool])

  // Load image and initialize canvas
  useEffect(() => {
    if (!image) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Load and draw image
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width
      canvas.height = img.height

      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Redraw any existing lines
      drawAllLines()
    }
    img.src = image
  }, [image])

  // Redraw lines when points or segments change
  useEffect(() => {
    if (points.length === 2) {
      const line = {
        x1: points[0].x,
        y1: points[0].y,
        x2: points[1].x,
        y2: points[1].y,
      }
      setMainLine(line)

      // Calculate segment lines if width segments is provided
      if (widthSegments && widthSegments > 0) {
        calculateSegmentLines(line, widthSegments)
      }

      // Update measurement data for parent component
      if (onMeasurementUpdate) {
        const lineLength = Math.sqrt(Math.pow(line.x2 - line.x1, 2) + Math.pow(line.y2 - line.y1, 2))

        onMeasurementUpdate({
          type: "length",
          points: points,
          length: lineLength,
          segments: widthSegments,
          segmentLines: segmentLines,
        })
      }
    }

    drawAllLines()
  }, [points, widthSegments, onMeasurementUpdate])

  // Handle canvas click
  const handleCanvasClick = (e) => {
    // Only allow drawing if ruler tool is active
    if (activeTool !== "ruler") return

    if (points.length >= 2) {
      // Reset if we already have 2 points
      setPoints([])
      setMainLine(null)
      setSegmentLines([])
      setIsDrawing(true)
    }

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setPoints((prev) => [...prev, { x, y }])

    if (points.length === 0) {
      setIsDrawing(true)
    } else if (points.length === 1) {
      setIsDrawing(false)
      // Automatically deactivate the ruler tool after drawing a line
      setActiveTool(null)
    }
  }

  // Calculate perpendicular segment lines
  const calculateSegmentLines = (line, numSegments) => {
    const { x1, y1, x2, y2 } = line
    const segments = []

    // Calculate line length
    const lineLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))

    // Calculate segment length
    const segmentLength = lineLength / numSegments

    // Calculate line angle
    const angle = Math.atan2(y2 - y1, x2 - x1)

    // Calculate perpendicular angle (90 degrees = PI/2 radians)
    const perpAngle = angle + Math.PI / 2

    // Calculate segment points and perpendicular lines
    for (let i = 1; i < numSegments; i++) {
      // Calculate point on main line
      const ratio = i / numSegments
      const segX = x1 + (x2 - x1) * ratio
      const segY = y1 + (y2 - y1) * ratio

      // Calculate perpendicular line (extend in both directions)
      const perpLength = lineLength / 4 // Adjust this value as needed

      const perpX1 = segX + perpLength * Math.cos(perpAngle)
      const perpY1 = segY + perpLength * Math.sin(perpAngle)
      const perpX2 = segX - perpLength * Math.cos(perpAngle)
      const perpY2 = segY - perpLength * Math.sin(perpAngle)

      segments.push({
        x1: perpX1,
        y1: perpY1,
        x2: perpX2,
        y2: perpY2,
      })
    }

    setSegmentLines(segments)
  }

  // Draw all lines on canvas
  const drawAllLines = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")

    // Redraw image first
    if (image) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Draw points
        points.forEach((point) => {
          ctx.beginPath()
          ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI)
          ctx.fillStyle = "red"
          ctx.fill()
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

        // Draw segment lines
        segmentLines.forEach((line) => {
          ctx.beginPath()
          ctx.moveTo(line.x1, line.y1)
          ctx.lineTo(line.x2, line.y2)
          ctx.strokeStyle = "green"
          ctx.lineWidth = 1
          ctx.stroke()
        })
      }
      img.src = image
    }
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
        <div className="placeholder">No image selected</div>
      )}
      {activeTool === "ruler" && (
        <div className="drawing-instructions">
          {points.length === 0 ? "Click to place the first point" : "Click to place the second point"}
        </div>
      )}
    </div>
  )
}

