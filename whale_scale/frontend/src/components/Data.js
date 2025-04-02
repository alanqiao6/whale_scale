import "./Data.css"

export default function Data({ formData, rulerData, manualCurveData, areaData }) {
  if (!formData && !rulerData && !manualCurveData && !areaData) {
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
            <p>
              <strong>Type:</strong> {rulerData.type}
            </p>
            <p>
              <strong>Curve Length:</strong> {rulerData.curveLength.toFixed(2)} px
            </p>
            <p>
              <strong>Segments:</strong> {rulerData.segments}
            </p>

            <h4>Width Segment Lengths</h4>
            <ul>
              {rulerData.widthSegments.map((seg) => (
                <li key={seg.index}>
                  Segment {seg.index}: {seg.length} px
                </li>
              ))}
            </ul>
          </div>
        )}

        {manualCurveData && (
          <div className="measurement-data">
            <h3>✏️ Manual Curve</h3>
            <p>
              <strong>Curve Length:</strong> {manualCurveData.curveLength.toFixed(2)} px
            </p>
            <p>
              <strong>Points:</strong> {manualCurveData.curvePoints.length}
            </p>
          </div>
        )}

        {areaData && (
          <div className="measurement-data">
            <h3>🔲 Area Measurement</h3>
            <p>
              <strong>Area:</strong> {areaData.area.toFixed(2)} px²
            </p>
            <p>
              <strong>Points:</strong> {areaData.polygonPoints.length}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

