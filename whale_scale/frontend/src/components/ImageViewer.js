
"use client"
import React, { useState, useEffect, useRef } from "react"
import "./ImageViewer.css"

export default function ImageViewer({
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
  formData
}) {

  const canvasRef = useRef(null)
  const [points, setPoints] = useState([])
  const [mainLine, setMainLine] = useState(null)
  const [segmentLines, setSegmentLines] = useState([])
  const [imgObj, setImgObj] = useState(null)
  const [crosshairs, setCrosshairs] = useState([])
  const [draggingIndex, setDraggingIndex] = useState(null)
  const [backendMessage, setBackendMessage] = useState("")
  const [manualCurvePoints, setManualCurvePoints] = useState([])
  const [polygonPoints, setPolygonPoints] = useState([])
  const [anglePoints, setAnglePoints] = useState([])
  const [angleLines, setAngleLines] = useState([])

  useEffect(() => {
    if (!image) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")

      canvas.width = canvas.parentElement.clientWidth
      canvas.height = canvas.parentElement.clientHeight

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      setImgObj(img)
    }
    img.src = image
  }, [image])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imgObj) return
    const ctx = canvas.getContext("2d")

    canvas.width = canvas.parentElement.clientWidth
    canvas.height = canvas.parentElement.clientHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imgObj, 0, 0, canvas.width, canvas.height)
    drawOverlay(ctx)
  }, [points, mainLine, segmentLines, crosshairs, imgObj, manualCurvePoints, polygonPoints, anglePoints, angleLines])

  useEffect(() => {
    if (points.length === 2) {
      const line = {
        x1: points[0].x,
        y1: points[0].y,
        x2: points[1].x,
        y2: points[1].y,
      }

      setMainLine(line)
      calculateSegmentLines(line, numSegments)

      const length = Math.hypot(line.x2 - line.x1, line.y2 - line.y1)

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

    if (activeTool === "Measure Curve") {
      setManualCurvePoints((prev) => [...prev, { x, y }])
      return
    }

    if (activeTool === "Measure Area") {
      setPolygonPoints((prev) => [...prev, { x, y }])
      return
    }
    
    if (activeTool === "Measure Angle") {
      setAnglePoints((prev) => [...prev, { x, y }])
      return
    }

    for (let i = 0; i < crosshairs.length; i++) {
      for (const side of ["left", "right"]) {
        const { x: cx, y: cy } = crosshairs[i][side]
        const dx = x - cx
        const dy = y - cy
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < crosshairSize) {
          setDraggingIndex({ segIndex: i, side })
          return
        }
      }
    }
  }

  const handleCanvasClick = (e) => {
    if (activeTool !== "Measure Widths") return

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

    numSegments = parseInt(numSegments)
    for (let i = 1; i <= numSegments; i++) {
      const ratio = i / (numSegments + 1)
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
        length: (length * (pixelDimension || 1)).toFixed(4),
      }
    })
    setCrosshairs(initialCrosshairs)
  }

  const handleFinalizeRuler = async () => {
    try {
      // Request total curve length from backend
      const payload = {
        measurement_stack: [{
          measurement_type: "curve",
          name: "curve_from_crosshairs",
          objects_params: crosshairs.map(pair => ({
            parms: {
              x: (pair.left.x + pair.right.x) / 2,
              y: (pair.left.y + pair.right.y) / 2
            }
          }))
        }],
        ...(pixelDimension && { pixel_dimension: pixelDimension })
      }
  
      const curveRes = await fetch("/api/morphometrix/calculate_curve/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
  
      const curveResult = await curveRes.json()
      if (!curveRes.ok) {
        setBackendMessage(`❗ Ruler Curve error: ${curveResult.error}`)
        return
      }
  
      const curveLength = curveResult.length
      const lengthPixels = Math.hypot(mainLine.x2 - mainLine.x1, mainLine.y2 - mainLine.y1)
  
      // Send total TL measurement
      onBackendResult({
        measurement_name: measurementName,
        measurement_type: "TL",
        user_image_path: image,
        image_timestamp: metadata?.image_timestamp ?? new Date().toISOString(),
        measurement_timestamp: new Date().toISOString(),
        coordinate_data: crosshairs,
        pixel_dimension: pixelDimension,
        pixel_count: lengthPixels,
        scaled_dimension: curveLength,
        focal_length: metadata?.focalLength,
        sensor_width: metadata?.sensorWidth,
        image_width: metadata?.imageWidth,
        image_height: metadata?.imageHeight,
        field_of_view: metadata?.fieldOfView,
        altitude: metadata?.altitude,
        altitude_offset: formData.altitudeOffset,
        gps_latitude: metadata?.gps_latitude,
        gps_longitude: metadata?.gps_longitude,
        camera_make: metadata?.camera_make,
        camera_model: metadata?.camera_model,
      })
  
      // Add per-segment results (TL_w{percent})
      const totalSegments = crosshairs.length
      crosshairs.forEach((pair, i) => {
        const dx = pair.right.x - pair.left.x
        const dy = pair.right.y - pair.left.y
        const pixelLength = Math.hypot(dx, dy)
        const realLength = parseFloat((pixelLength * (pixelDimension || 1)).toFixed(4))
        const percent = Math.round(((i + 1) / (totalSegments + 1)) * 100)
  
        onBackendResult({
          measurement_name: measurementName,
          measurement_type: `TL_w${percent}`,
          user_image_path: image,
          image_timestamp: metadata?.image_timestamp ?? new Date().toISOString(),
          measurement_timestamp: new Date().toISOString(),
          coordinate_data: pair,
          pixel_dimension: pixelDimension,
          pixel_count: pixelLength,
          scaled_dimension: realLength,
          focal_length: metadata?.focalLength,
          sensor_width: metadata?.sensorWidth,
          image_width: metadata?.imageWidth,
          image_height: metadata?.imageHeight,
          field_of_view: metadata?.fieldOfView,
          altitude: metadata?.altitude,
          altitude_offset: formData.altitudeOffset,
          gps_latitude: metadata?.gps_latitude,
          gps_longitude: metadata?.gps_longitude,
          camera_make: metadata?.camera_make,
          camera_model: metadata?.camera_model,
        })
      })
  
      setBackendMessage(`✅ Entry Added to Data Tab With Name "${measurementName}"`)
    } catch (err) {
      console.error("Ruler error:", err)
      setBackendMessage("❗ Error connecting to backend for ruler")
    }
  }
  

  const handleFinalizeManualCurve = async () => {
      if (manualCurvePoints.length < 2) return

      const payload = {
          measurement_stack: [{
              measurement_type: "curve",  // Use uppercase as in the old version
              name: "manual_curve",
              objects_params: manualCurvePoints.map(point => ({
                  parms: {
                      x: point.x,
                      y: point.y
                  }
              }))
          }],
          ...(pixelDimension && { pixel_dimension: pixelDimension })
      };

      console.log("Sending payload:", JSON.stringify(payload, null, 2));

      try {
          // Use the same URL path as in the old version
          const response = await fetch("/api/morphometrix/calculate_curve/", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
          });

          if (!response.ok) {
              const errorText = await response.text();
              console.error("Server response:", errorText);
              throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          const lengthPixels = manualCurvePoints.reduce((sum, p, i, arr) => {
            if (i === 0) return 0
            const dx = p.x - arr[i - 1].x
            const dy = p.y - arr[i - 1].y
            return sum + Math.hypot(dx, dy)
          }, 0)
          
          const curveLength = result.length

          setBackendMessage(`✅ Entry Added to Data Tab With Name ${measurementName}`);

          onBackendResult({
            measurement_name: measurementName,
            measurement_type: "curve_length",
            user_image_path: image,
            image_timestamp: metadata?.image_timestamp ?? new Date().toISOString(),
            measurement_timestamp: new Date().toISOString(),
            coordinate_data: manualCurvePoints,
            pixel_dimension: pixelDimension,
            pixel_count: lengthPixels,
            scaled_dimension: curveLength,
            focal_length: metadata?.focalLength,
            sensor_width: metadata?.sensorWidth,
            image_width: metadata?.imageWidth,
            image_height: metadata?.imageHeight,
            field_of_view: metadata?.fieldOfView,
            altitude: metadata?.altitude,
            altitude_offset: formData.altitudeOffset,
            gps_latitude: metadata?.gps_latitude,
            gps_longitude: metadata?.gps_longitude,
            camera_make: metadata?.camera_make,
            camera_model: metadata?.camera_model,
          })
          
          setManualCurvePoints([]);
          setActiveTool(null);
      } catch (err) {
          console.error("Full error:", err);
          setBackendMessage("❗ Error connecting to backend for manual curve");
      }
  };

  const handleFinalizeArea = async () => {
    if (polygonPoints.length < 3) {
      setBackendMessage("❗ Need at least 3 points for area calculation")
      return
    }
  
    try {
      const payload = {
        measurement: {
          measurement_type: 2,  // Using numeric type as shown in the backend example
          name: "Polygon Area",
          objects_params: [
            {
              type: 5,  // Type for polygon
              parms: polygonPoints  // Direct array of points, not wrapped in a 'points' property
            }
          ]
        },
        ...(pixelDimension && { pixel_dimension: pixelDimension })
      }
  
      const response = await fetch("/api/morphometrix/calculate_area/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
  
      const result = await response.json()
      if (!response.ok) {
        setBackendMessage(`❗ Area calculation error: ${result.error}`)
        return
      }
  
      setBackendMessage(`✅ Entry Added to Data Tab With Name ${measurementName}`)
  
      onBackendResult({
        measurement_name: measurementName,
        measurement_type: "area",
        user_image_path: image,
        image_timestamp: metadata?.image_timestamp ?? new Date().toISOString(),
        measurement_timestamp: new Date().toISOString(),
        coordinate_data: polygonPoints,
        pixel_dimension: pixelDimension,
        pixel_count: null,
        scaled_dimension: result.area,
        focal_length: metadata?.focalLength,
        sensor_width: metadata?.sensorWidth,
        image_width: metadata?.imageWidth,
        image_height: metadata?.imageHeight,
        field_of_view: metadata?.fieldOfView,
        altitude: metadata?.altitude,
        altitude_offset: formData.altitudeOffset,
        gps_latitude: metadata?.gps_latitude,
        gps_longitude: metadata?.gps_longitude,
        camera_make: metadata?.camera_make,
        camera_model: metadata?.camera_model,
      })
  
      setPolygonPoints([])
      setActiveTool(null)
    } catch (err) {
      console.error(err)
      setBackendMessage("❗ Error connecting to backend for area calculation")
    }
  }

  useEffect(() => {
    if (anglePoints.length === 3) {
      // Create two lines from the three points
      const lines = [
        {
          x1: anglePoints[1].x,
          y1: anglePoints[1].y,
          x2: anglePoints[0].x,
          y2: anglePoints[0].y,
        },
        {
          x1: anglePoints[1].x,
          y1: anglePoints[1].y,
          x2: anglePoints[2].x,
          y2: anglePoints[2].y,
        }
      ]
      setAngleLines(lines)
    }
  }, [anglePoints])

  const handleFinalizeAngle = async () => {
    if (anglePoints.length < 3) {
      setBackendMessage("❗ Need 3 points to measure an angle")
      return
    }

    try {
      const payload = {
        measurement: {
          measurement_type: 3, // Type for angle measurement
          name: "Angle Measurement",
          objects_params: [
            {
              type: 1, // Type for line
              parms: {
                x1: anglePoints[1].x,
                y1: anglePoints[1].y,
                x2: anglePoints[0].x,
                y2: anglePoints[0].y
              }
            },
            {
              type: 1, // Type for line
              parms: {
                x1: anglePoints[1].x,
                y1: anglePoints[1].y,
                x2: anglePoints[2].x,
                y2: anglePoints[2].y
              }
            }
          ]
        }
      }

      const response = await fetch("/api/morphometrix/calculate_angle/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (!response.ok) {
        setBackendMessage(`❗ Angle calculation error: ${result.error}`)
        return
      }

      setBackendMessage(`✅ Entry Added to Data Tab With Name ${measurementName}`)

      onBackendResult({
        measurement_name: measurementName,
        measurement_type: "angle",
        user_image_path: image,
        image_timestamp: metadata?.image_timestamp ?? new Date().toISOString(),
        measurement_timestamp: new Date().toISOString(),
        coordinate_data: anglePoints,
        pixel_dimension: pixelDimension,
        pixel_count: null,
        scaled_dimension: result.angle,
        focal_length: metadata?.focalLength,
        sensor_width: metadata?.sensorWidth,
        image_width: metadata?.imageWidth,
        image_height: metadata?.imageHeight,
        field_of_view: metadata?.fieldOfView,
        altitude: metadata?.altitude,
        altitude_offset: formData.altitudeOffset,
        gps_latitude: metadata?.gps_latitude,
        gps_longitude: metadata?.gps_longitude,
        camera_make: metadata?.camera_make,
        camera_model: metadata?.camera_model,
      })

      setAnglePoints([])
      setAngleLines([])
      setActiveTool(null)
    } catch (err) {
      console.error(err)
      setBackendMessage("❗ Error connecting to backend for angle calculation")
    }
  }

  const drawOverlay = (ctx) => {

    if (mainLine) {
      ctx.beginPath()
      ctx.moveTo(mainLine.x1, mainLine.y1)
      ctx.lineTo(mainLine.x2, mainLine.y2)
      ctx.strokeStyle = segmentColor
      ctx.lineWidth = 15
      ctx.stroke()
    }

    crosshairs.forEach((pair) => {
      ctx.beginPath()
      ctx.moveTo(pair.left.x, pair.left.y)
      ctx.lineTo(pair.right.x, pair.right.y)
      ctx.strokeStyle = segmentColor
      ctx.lineWidth = 10
      ctx.stroke()
    })

    crosshairs.forEach((pair) => {
      ["left", "right"].forEach((side) => {
        const point = pair[side]
        ctx.beginPath()
        const radius = crosshairSize
    
        ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI)
        ctx.strokeStyle = "black"
        ctx.lineWidth = 6
        ctx.stroke()
      })
    })

    if (manualCurvePoints.length > 0) {
      ctx.beginPath()
      ctx.moveTo(manualCurvePoints[0].x, manualCurvePoints[0].y)
      for (let i = 1; i < manualCurvePoints.length; i++) {
        ctx.lineTo(manualCurvePoints[i].x, manualCurvePoints[i].y)
      }
      ctx.strokeStyle = "orange"
      ctx.lineWidth = 20
      ctx.stroke()

      manualCurvePoints.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 24, 0, 2 * Math.PI)
        ctx.fillStyle = "orange"
        ctx.fill()
      })
    }

    // Draw polygon for area calculation
    if (polygonPoints.length > 0) {
      ctx.beginPath()
      ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y)

      for (let i = 1; i < polygonPoints.length; i++) {
        ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y)
      }

      // Close the polygon if there are at least 3 points
      if (polygonPoints.length >= 3) {
        ctx.lineTo(polygonPoints[0].x, polygonPoints[0].y)
      }

      ctx.strokeStyle = "magenta"
      ctx.lineWidth = 20
      ctx.stroke()

      // Fill with semi-transparent color
      ctx.fillStyle = "rgba(128, 0, 128, 0.2)"
      ctx.fill()

      // Draw points
      polygonPoints.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 24, 0, 2 * Math.PI)
        ctx.fillStyle = "magenta"
        ctx.fill()
      })
    }

    // Draw angle lines and points
    if (anglePoints.length > 0) {
      // Draw the points
      anglePoints.forEach((point, index) => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, 36, 0, 2 * Math.PI)
        ctx.fillStyle = index === 1 ? "yellow" : "blue" // Middle point (vertex) is yellow
        ctx.strokeStyle = "white"
        ctx.lineWidth = 30
        ctx.fill()
        ctx.stroke()
      })

      // Draw first line
      if (anglePoints.length >= 2) {
        ctx.beginPath()
        ctx.moveTo(anglePoints[1].x, anglePoints[1].y) // Start from the middle point
        ctx.lineTo(anglePoints[0].x, anglePoints[0].y)
        ctx.strokeStyle = "blue"
        ctx.lineWidth = 30
        ctx.stroke()
      }

      // Draw second line
      if (anglePoints.length >= 3) {
        ctx.beginPath()
        ctx.moveTo(anglePoints[1].x, anglePoints[1].y) // Start from the middle point
        ctx.lineTo(anglePoints[2].x, anglePoints[2].y)
        ctx.strokeStyle = "blue"
        ctx.lineWidth = 30
        ctx.stroke()
      }
    }
  }

  const handleClearMeasurement = () => {
    if (activeTool === "Measure Area") {
      setPolygonPoints([])
    } else if (activeTool === "Measure Curve") {
      setManualCurvePoints([])
    } else if (activeTool === "Measure Angle") {
      setAnglePoints([])
      setAngleLines([])
    } else if (activeTool === "Measure Widths" || (activeTool === null && crosshairs.length > 0)) {
      setPoints([])
      setMainLine(null)
      setSegmentLines([])
      setCrosshairs([])
    }
    setBackendMessage("")
  }  

  return (
    <div className="image-container">
      {image ? (
        <>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            className={`image-canvas ${activeTool ? `${activeTool}-active` : ""}`}
          />

          {manualCurvePoints.length > 0 && activeTool === "Measure Curve" && (
            <button
              className="finalize-button"
              onClick={handleFinalizeManualCurve}
              style={{
                position: "absolute",
                bottom: "3%",
                left: "45%",
                transform: "translateX(-50%)",
                zIndex: 20,
                padding: "10px 20px",
                background: "orange",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              ✏️ Finalize Curve
            </button>
          )}

          {polygonPoints.length > 2 && activeTool === "Measure Area" && (
            <button
              className="finalize-button"
              onClick={handleFinalizeArea}
              style={{
                position: "absolute",
                bottom: "3%",
                left: "45%",
                transform: "translateX(-50%)",
                zIndex: 20,
                padding: "10px 20px",
                background: "purple",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              🔲 Calculate Area
            </button>
          )}

          {crosshairs.length > 0 && activeTool === null && (
            <>
              <button
                className="finalize-button"
                onClick={handleFinalizeRuler}
                style={{
                  position: "absolute",
                  bottom: "3%",
                  left: "45%",
                  transform: "translateX(-50%)",
                  zIndex: 20,
                  padding: "10px 20px",
                  background: "#0077cc",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                ✅ Finalize Ruler
              </button>
            </>
          )}

          {anglePoints.length === 3 && activeTool === "Measure Angle" && (
            <button
              className="finalize-button"
              onClick={handleFinalizeAngle}
              style={{
                position: "absolute",
                bottom: "3%",
                left: "45%",
                transform: "translateX(-50%)",
                zIndex: 20,
                padding: "10px 20px",
                background: "#5555FF",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              📐 Calculate Angle
            </button>
          )}

          {(manualCurvePoints.length > 0 || polygonPoints.length > 0 || points.length > 0) && (
            <button
              className="clear-button"
              onClick={handleClearMeasurement}
              style={{
                position: "absolute",
                bottom: "3%",
                right: "15%",
                maxWidth: "calc(100% - 20px)",
                padding: "10px 20px",
                background: "#ff3333",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                zIndex: 20,
              }}
            >
              🗑️ Clear
            </button>
          )}

          {backendMessage && (
            <p
              style={{
                position: "absolute",
                bottom: "8%",
                left: "45%",
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

      {activeTool === "Measure Widths" && (
        <div className="drawing-instructions">
          {points.length === 0 ? "Click to place the first point" : "Click to place the second point"}
        </div>
      )}

      {activeTool === "Measure Area" && (
        <div className="drawing-instructions">Click to place points for area calculation. Need at least 3 points.</div>
      )}

      {activeTool === "Measure Angle" && (
        <div className="drawing-instructions">
          {anglePoints.length === 0
            ? "Click to place the first point"
            : anglePoints.length === 1
            ? "Click to place the vertex point (middle point)"
            : anglePoints.length === 2
            ? "Click to place the third point"
            : "Click 'Calculate Angle' to measure"}
        </div>
      )}
    </div>
  )
}
