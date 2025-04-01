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
  onBackendResult,
}) {
  const canvasRef = useRef(null)
  const [points, setPoints] = useState([])
  const [mainLine, setMainLine] = useState(null)
  const [segmentLines, setSegmentLines] = useState([])
  const [imgObj, setImgObj] = useState(null)
  const [crosshairs, setCrosshairs] = useState([])
  const [draggingIndex, setDraggingIndex] = useState(null)
  const [backendMessage, setBackendMessage] = useState("")

  useEffect(() => {
    if (!image) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")

      canvas.width = img.width
      canvas.height = img.height

      ctx.drawImage(img, 0, 0)
      setImgObj(img)
    }
    img.src = image
  }, [image])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imgObj) return
    const ctx = canvas.getContext("2d")

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imgObj, 0, 0)
    drawOverlay(ctx)
  }, [points, mainLine, segmentLines, crosshairs, imgObj])

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

      setActiveTool(null)
    }
  }, [points])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingIndex) return
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const mouseX = (e.clientX - rect.left) * scaleX
      const mouseY = (e.clientY - rect.top) * scaleY

      setCrosshairs((prev) => {
        const updated = [...prev]
        const { segIndex, side } = draggingIndex
        const { origin } = prev[segIndex]
        const { x1, y1, dx, dy } = origin

        const t = ((mouseX - x1) * dx + (mouseY - y1) * dy) / (dx * dx + dy * dy)
        updated[segIndex][side] = {
          x: x1 + t * dx,
          y: y1 + t * dy,
        }        
        return updated
      })
    }

    const handleMouseUp = () => {
      setDraggingIndex(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [draggingIndex])

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    for (let i = 0; i < crosshairs.length; i++) {
      for (let side of ["left", "right"]) {
        const { x: cx, y: cy } = crosshairs[i][side]
        const dx = x - cx
        const dy = y - cy
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 12) {
          setDraggingIndex({ segIndex: i, side })
          return
        }
      }
    }
  }

  const handleCanvasClick = (e) => {
    if (activeTool !== "ruler") return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    if (points.length === 2) {
      setPoints([{ x, y }])
      setMainLine(null)
      setSegmentLines([])
      setCrosshairs([])
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

    for (let i = 0; i < numSegments; i++) {
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

    const initialCrosshairs = segments.map((seg) => {
      const dx = seg.x2 - seg.x1
      const dy = seg.y2 - seg.y1
      const length = Math.hypot(dx, dy)
      return {
        left: { x: seg.x1, y: seg.y1 },
        right: { x: seg.x2, y: seg.y2 },
        origin: { x1: seg.x1, y1: seg.y1, dx, dy },
        length: length.toFixed(2),
      }
    })
    setCrosshairs(initialCrosshairs)
  }

  const formatMeasurementPayload = () => {
    return {
      measurement_stack: [
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
  }

  const handleFinalize = async () => {
    try {
      const payload = formatMeasurementPayload()

      const curveRes = await fetch("/morphometrix/calculate_curve/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const curveResult = await curveRes.json()
      if (!curveRes.ok) {
        setBackendMessage(`❗ Curve error: ${curveResult.error}`)
        return
      }

      const curveLength = curveResult.length
      const curvePoints = curveResult.curve_points || []

      const widths = crosshairs.map((pair, i) => {
        const dx = pair.right.x - pair.left.x
        const dy = pair.right.y - pair.left.y
        const length = Math.hypot(dx, dy)
        return {
          index: i + 1,
          length: length.toFixed(2),
          coords: {
            x1: pair.left.x,
            y1: pair.left.y,
            x2: pair.right.x,
            y2: pair.right.y,
          }
        }
      })

      setBackendMessage(`✅ Curve: ${curveLength.toFixed(2)} px`)

      try {
        onBackendResult({
          curveLength,
          curvePoints,
          widthSegments: widths, // array of { index, length, coords }
        })
      } catch (err) {
        console.error("❗ Error in onBackendResult:", err)
        setBackendMessage("❗ Error processing backend result")
      }
      

    } catch (err) {
      setBackendMessage("❗ Error connecting to backend")
    }
  }

  const drawOverlay = (ctx) => {
    points.forEach((point) => {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 36, 0, 2 * Math.PI)
      ctx.fillStyle = "red"
      ctx.strokeStyle = "white"
      ctx.lineWidth = 30
      ctx.fill()
      ctx.stroke()
    })

    if (mainLine) {
      ctx.beginPath()
      ctx.moveTo(mainLine.x1, mainLine.y1)
      ctx.lineTo(mainLine.x2, mainLine.y2)
      ctx.strokeStyle = "blue"
      ctx.lineWidth = 40
      ctx.stroke()
    }

    crosshairs.forEach((pair) => {
      ctx.beginPath()
      ctx.moveTo(pair.left.x, pair.left.y)
      ctx.lineTo(pair.right.x, pair.right.y)
      ctx.strokeStyle = "green"
      ctx.lineWidth = 30
      ctx.stroke()
    })

    crosshairs.forEach((pair) => {
      ["left", "right"].forEach((side) => {
        const point = pair[side]
        ctx.beginPath()
        ctx.arc(point.x, point.y, 30, 0, 2 * Math.PI)
        ctx.fillStyle = "white"
        ctx.strokeStyle = "black"
        ctx.lineWidth = 30
        ctx.fill()
        ctx.stroke()
      })
    })
  }

  return (
    <div className="image-container">
      {image ? (
        <>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            className={`image-canvas ${activeTool === "ruler" ? "ruler-active" : ""}`}
          />

          {crosshairs.length > 0 && (
            <>
              <button
                className="finalize-button"
                onClick={handleFinalize}
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 20,
                  padding: "10px 20px",
                  background: "#0077cc",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                ✅ Finalize
              </button>

              {backendMessage && (
                <p
                  style={{
                    position: "absolute",
                    bottom: 60,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 20,
                    background: "rgba(0,0,0,0.6)",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    fontWeight: "bold",
                  }}
                >
                  {backendMessage}
                </p>
              )}
            </>
          )}
        </>
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
