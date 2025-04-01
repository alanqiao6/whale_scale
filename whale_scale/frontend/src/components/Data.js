import "./Data.css"
import React from "react"

export default function Data({ formData, measurementData }) {
  if (!formData && !measurementData) {
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

        {measurementData && (
          <div className="measurement-data">
            <h3>Measurements</h3>
            {measurementData.type && (
              <p>
                <strong>Type:</strong> {measurementData.type}
              </p>
            )}
            {measurementData.length && (
              <p>
                <strong>Pixel Length:</strong> {measurementData.length.toFixed(2)} px
              </p>
            )}
            {measurementData.segments && (
              <p>
                <strong>Segments:</strong> {measurementData.segments}
              </p>
            )}

            {measurementData.curveLength && (
              <p>
                <strong>Curve Length:</strong> {measurementData.curveLength.toFixed(2)} px
              </p>
            )}

            {measurementData.widthSegments && (
              <div className="segment-widths">
                <h3>Width Segment Lengths</h3>
                <ul>
                  {measurementData.widthSegments.map((seg) => (
                    <li key={seg.index}>
                      Segment {seg.index}: {seg.length} px
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* If we have real-world measurements (calculated from focal length and altitude) */}
            {formData && formData.focalLength && formData.altitude && measurementData.length && (
              <div className="real-measurements">
                <h3>Real-world Measurements</h3>
                <p>
                  <strong>Estimated Length:</strong>{" "}
                  {calculateRealLength(
                    measurementData.length,
                    Number.parseFloat(formData.focalLength),
                    Number.parseFloat(formData.altitude),
                  ).toFixed(2)}{" "}
                  m
                </p>
              </div>
            )}
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
