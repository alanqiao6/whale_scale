import "./Data.css"
import React from "react"

export default function Data({ formData, rulerData, manualCurveData }) {
  if (!formData && !rulerData && !manualCurveData) {
    return (
      <div className="data-section">
        <h2>Data</h2>
        <p>No data submitted yet.</p>
      </div>
    )
  }

  return (
    <div className="data-section">
      <h2>Measurement Data</h2>
      <div className="data-content">
        {formData && (
          <div className="form-data">
            <h3>Form Data</h3>
            <p>
              <strong>Focal Length:</strong> {formData.focalLength} mm
            </p>
            <p>
              <strong>Altitude:</strong> {formData.altitude} m
            </p>
            <p>
              <strong>Width Segments:</strong> {formData.widthSegments}
            </p>
            <p>
              <strong>Mirror Side:</strong> {formData.mirrorSide}
            </p>
          </div>
        )}

        {rulerData && (
          <div className="measurement-data">
            <h3>📏 Ruler Measurements</h3>
            <p><strong>Type:</strong> {rulerData.type}</p>
            <p><strong>Curve Length:</strong> {rulerData.curveLength.toFixed(2)} px</p>
            <p><strong>Segments:</strong> {rulerData.segments}</p>

            <h4>Width Segment Lengths</h4>
            <ul>
              {rulerData.widthSegments.map((seg) => (
                <li key={seg.index}>
                  Segment {seg.index}: {seg.length} px
                </li>
              ))}
            </ul>

            {formData?.focalLength && formData?.altitude && (
              <div className="real-measurements">
                <h3>Real-world Measurements</h3>
                <p>
                  <strong>Estimated Length:</strong>{" "}
                  {calculateRealLength(
                    rulerData.curveLength,
                    Number.parseFloat(formData.focalLength),
                    Number.parseFloat(formData.altitude),
                  ).toFixed(2)}{" "}
                  m
                </p>
              </div>
            )}
          </div>
        )}

        {manualCurveData && (
          <div className="measurement-data">
            <h3>✏️ Manual Curve</h3>
            <p><strong>Curve Length:</strong> {manualCurveData.curveLength.toFixed(2)} px</p>
            <p><strong>Points:</strong> {manualCurveData.curvePoints.length}</p>
          </div>
        )}

      </div>
    </div>
  )
}

// Function to calculate real-world length from pixel length
function calculateRealLength(pixelLength, focalLength, altitude) {
  // This is a simplified calculation - you may need to adjust based on your specific requirements
  // The formula assumes a simple pinhole camera model
  if (!focalLength || !altitude) return 0

  // Convert focal length to meters if it's in mm
  const focalLengthMeters = focalLength / 1000

  // Assume a standard sensor size and pixel density
  // This would need to be calibrated for your specific camera
  const pixelSize = 0.00001 // 10 micrometers per pixel (example value)

  // Calculate real-world length
  return (pixelLength * pixelSize * altitude) / focalLengthMeters
}
