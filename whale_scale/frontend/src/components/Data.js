import "./Data.css"
import React from "react"

export default function Data({ formData, rulerData, manualCurveData, areaData, angleData, bodyConditionData, pixelDimension }) {

  // Function to export data to CSV with multiple tables
  const exportDataToCSV = () => {
    console.log("Starting export function...");
    
    // Check if any data exists to export
    if (!formData && !rulerData && !manualCurveData && !areaData && !angleData && !bodyConditionData) {
      alert("No data to export");
      return;
    }
    
    try {
      // Initialize CSV rows array
      let csvRows = [];
      
      // Add Form Data Table
      if (formData) {
        csvRows.push("FORM DATA");
        csvRows.push("Parameter,Value");
        
        csvRows.push(`Focal Length,${format(formData.focalLength)}`);
        csvRows.push(`Altitude,${format(formData.altitude)}`);
        csvRows.push(`Altitude Offset,${format(formData.altitudeOffset)}`);
        csvRows.push(`Image Width,${format(formData.imageWidth)}`);
        csvRows.push(`Image Height,${format(formData.imageHeight)}`);
        csvRows.push(`Field of View,${format(formData.fov)}`);
        csvRows.push(`Sensor Width,${format(formData.sensorWidth)}`);
        csvRows.push(`Width Segments,${format(formData.widthSegments)}`);
        csvRows.push(`Crosshair Size,${format(formData.crosshairSize)}`);
        csvRows.push(`Crosshair Opacity,${format(formData.crosshairOpacity)}`);
        csvRows.push(`Segment Color,${format(formData.segmentColor)}`);
        csvRows.push(`Pixel Dimension,${format(pixelDimension)}`);
        
        // Add empty row as separator
        csvRows.push("");
      }
      
      // Add Ruler Measurements Table
      if (rulerData) {
        csvRows.push("RULER MEASUREMENTS");
        csvRows.push("Parameter,Value");
        
        csvRows.push(`Type,${rulerData.type || "ruler"}`);
        csvRows.push(`Curve Length,${rulerData.curveLength.toFixed(2)} m`);
        csvRows.push(`Segments,${rulerData.segments}`);
        
        // Add empty row as separator
        csvRows.push("");
        
        // Add Width Segments Table
        if (rulerData.widthSegments && Array.isArray(rulerData.widthSegments) && rulerData.widthSegments.length > 0) {
          csvRows.push("WIDTH SEGMENTS");
          csvRows.push("Segment,Length (m),X1,Y1,X2,Y2");
          
          rulerData.widthSegments.forEach(seg => {
            if (seg && seg.index !== undefined && seg.length !== undefined) {
              let x1 = seg.coords?.x1 || "";
              let y1 = seg.coords?.y1 || "";
              let x2 = seg.coords?.x2 || "";
              let y2 = seg.coords?.y2 || "";
              
              csvRows.push(`${seg.index},${seg.length},${x1},${y1},${x2},${y2}`);
            }
          });
          
          // Add empty row as separator
          csvRows.push("");
        }
      }
      
      // Add Area Measurements Table
      if (areaData) {
        csvRows.push("AREA MEASUREMENTS");
        csvRows.push("Parameter,Value");
        
        csvRows.push(`Area,${areaData.area.toFixed(2)} m²`);
        csvRows.push(`Number of Points,${areaData.polygonPoints?.length || 0}`);
        
        // Add empty row as separator
        csvRows.push("");
        
        // Add Area Points Table
        if (areaData.polygonPoints && Array.isArray(areaData.polygonPoints) && areaData.polygonPoints.length > 0) {
          csvRows.push("AREA POINTS");
          csvRows.push("Point,X,Y");
          
          areaData.polygonPoints.forEach((point, index) => {
            if (point && point.x !== undefined && point.y !== undefined) {
              csvRows.push(`${index + 1},${point.x},${point.y}`);
            }
          });
          
          // Add empty row as separator
          csvRows.push("");
        }
      }
      
      // Add Manual Curve Table
      if (manualCurveData) {
        csvRows.push("MANUAL CURVE MEASUREMENTS");
        csvRows.push("Parameter,Value");
        
        csvRows.push(`Curve Length,${manualCurveData.curveLength.toFixed(2)} m`);
        csvRows.push(`Number of Points,${manualCurveData.curvePoints?.length || 0}`);
        
        // Add empty row as separator
        csvRows.push("");
        
        // Add Curve Points Table
        if (manualCurveData.curvePoints && Array.isArray(manualCurveData.curvePoints) && manualCurveData.curvePoints.length > 0) {
          csvRows.push("CURVE POINTS");
          csvRows.push("Point,X,Y");
          
          manualCurveData.curvePoints.forEach((point, index) => {
            if (point && point.x !== undefined && point.y !== undefined) {
              csvRows.push(`${index + 1},${point.x},${point.y}`);
            }
          });
          
          // Add empty row as separator
          csvRows.push("");
        }
      }
      
      // Add Angle Measurements Table
      if (angleData) {
        csvRows.push("ANGLE MEASUREMENTS");
        csvRows.push("Parameter,Value");
        
        csvRows.push(`Angle,${angleData.angle.toFixed(2)}°`);
        csvRows.push(`Number of Points,${angleData.anglePoints?.length || 0}`);
        
        // Add empty row as separator
        csvRows.push("");
        
        // Add Angle Points Table
        if (angleData.anglePoints && Array.isArray(angleData.anglePoints) && angleData.anglePoints.length > 0) {
          csvRows.push("ANGLE POINTS");
          csvRows.push("Point,X,Y");
          
          angleData.anglePoints.forEach((point, index) => {
            if (point && point.x !== undefined && point.y !== undefined) {
              csvRows.push(`${index + 1},${point.x},${point.y}`);
            }
          });
          
          // Add empty row as separator
          csvRows.push("");
        }
      }
      
      // Add Body Condition Table
      if (bodyConditionData) {
        csvRows.push("BODY CONDITION RESULTS");
        csvRows.push("Parameter,Value");
        
        if (bodyConditionData.volume !== undefined && !isNaN(bodyConditionData.volume)) {
          csvRows.push(`Body Volume,${bodyConditionData.volume.toFixed(2)} m³`);
        }
        
        if (bodyConditionData.areaIndex !== undefined && !isNaN(bodyConditionData.areaIndex)) {
          csvRows.push(`Body Area Index,${bodyConditionData.areaIndex.toFixed(2)}`);
        }
        
        if (bodyConditionData.surfaceArea !== undefined && !isNaN(bodyConditionData.surfaceArea)) {
          csvRows.push(`Surface Area,${bodyConditionData.surfaceArea.toFixed(2)} m²`);
        }
        
        // Add additional body condition results
        if (bodyConditionData.fullResults) {
          Object.entries(bodyConditionData.fullResults)
            .filter(([key, value]) => 
              !['Image', 'Image_ID'].includes(key) && 
              value !== null && 
              !isNaN(value) &&
              !key.startsWith('Length_w') &&
              !key.startsWith('Width_')
            )
            .forEach(([key, value]) => {
              csvRows.push(`${key},${typeof value === 'number' ? value.toFixed(2) : value}`);
            });
        }
        
        // Add empty row as separator
        csvRows.push("");
      }
      
      // Create the CSV content with escaped values
      const csvContent = csvRows.map(row => {
        // If the row contains a comma, escape any fields that need it
        if (row.includes(',')) {
          return row.split(',').map(field => {
            // Check if the field needs to be escaped
            if (field.includes('"') || field.includes(',') || field.includes('\n')) {
              // Escape quotes by doubling them and wrap in quotes
              return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
          }).join(',');
        }
        return row;
      }).join('\n');
      
      // Create filename
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const imagePath = formData && formData.imagePath ? formData.imagePath : "image";
      const fileName = `whalescale_${formData ? (formData.widthSegments || "0") : "0"}_${getFileNameFromPath(imagePath)}_${date}.csv`;
      
      console.log("Creating download with filename:", fileName);
      console.log("CSV Content Preview (first 500 chars):", csvContent.substring(0, 500));
      
      // Use Blob API for download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create link and trigger download
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
        console.log("Export completed successfully and object URL revoked");
      }, 100);
    } catch (err) {
      console.error("Error during export:", err);
      alert(`Export failed: ${err.message}`);
    }
  };

  // Helper function to extract filename from path
  const getFileNameFromPath = (path) => {
    if (!path) return "unknown";
    const pathParts = path.split(/[\/\\]/);
    const fileName = pathParts[pathParts.length - 1];
    return fileName.replace(/\.[^/.]+$/, ""); // Remove extension
  };
  
  // Add export function to make it accessible from outside
  React.useEffect(() => {
    // Expose the export function globally so Sidebar can access it
    window.exportDataToCSV = exportDataToCSV;
    console.log("Export function is now available at window.exportDataToCSV");
    
    // Cleanup function
    return () => {
      delete window.exportDataToCSV;
      console.log("Export function removed from window");
    };
  }, [formData, rulerData, manualCurveData, areaData, angleData, bodyConditionData, pixelDimension]);

  if (!formData && !rulerData && !manualCurveData && !areaData && !angleData && !bodyConditionData) {
    return (
      <div className="data-section">
        <h2>Data</h2>
        <p>No data submitted yet.</p>
      </div>
    )
  }

  const format = (value) => (value !== undefined && value !== null && value !== "" ? value : "None")

  return (
    <div className="data-section">
      <h2>Measurement Data</h2>
      <div className="data-content">
        {formData && (
          <div className="form-data">
            <h3>Form Data</h3>
            <p><strong>Focal Length:</strong> {format(formData.focalLength)}</p>
            <p><strong>Altitude:</strong> {format(formData.altitude)}</p>
            <p><strong>Altitude Offset:</strong> {format(formData.altitudeOffset)}</p>
            <p><strong>Image Width:</strong> {format(formData.imageWidth)}</p>
            <p><strong>Image Height:</strong> {format(formData.imageHeight)}</p>
            <p><strong>Field of View:</strong> {format(formData.fov)}</p>
            <p><strong>Sensor Width:</strong> {format(formData.sensorWidth)}</p>
            <p><strong>Width Segments:</strong> {format(formData.widthSegments)}</p>
            <p><strong>Crosshair Size:</strong> {format(formData.crosshairSize)}</p>
            <p><strong>Crosshair Opacity:</strong> {format(formData.crosshairOpacity)}</p>
            <p><strong>Segment Color:</strong> {format(formData.segmentColor)}</p>
            <p><strong>Pixel Dimension:</strong> {format(pixelDimension)}</p>
          </div>
        )}

        {rulerData && (
          <div className="measurement-data">
            <h3>📏 Ruler Measurements</h3>
            <p>
              <strong>Type:</strong> {rulerData.type}
            </p>
            <p>
              <strong>Curve Length:</strong> {rulerData.curveLength.toFixed(2)} m
            </p>
            <p>
              <strong>Segments:</strong> {rulerData.segments}
            </p>

            <h4>Width Segment Lengths</h4>
            <ul>
              {rulerData.widthSegments.map((seg) => (
                <li key={seg.index}>
                  Segment {seg.index}: {seg.length} m
                </li>
              ))}
            </ul>
          </div>
        )}

        {manualCurveData && (
          <div className="measurement-data">
            <h3>✏️ Manual Curve</h3>
            <p>
              <strong>Curve Length:</strong> {manualCurveData.curveLength.toFixed(2)} m
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
              <strong>Area:</strong> {areaData.area.toFixed(2)} m²
            </p>
            <p>
              <strong>Points:</strong> {areaData.polygonPoints.length}
            </p>
          </div>
        )}
        
        {angleData && (
          <div className="measurement-data">
            <h3>📐 Angle Measurement</h3>
            <p>
              <strong>Angle:</strong> {angleData.angle.toFixed(2)}°
            </p>
            <p>
              <strong>Points:</strong> {angleData.anglePoints.length}
            </p>
          </div>
        )}
        
        {bodyConditionData && (
          <div className="measurement-data">
            <h3>🐋 Body Condition Results</h3>
            {bodyConditionData.volume && (
              <p>
                <strong>Body Volume:</strong> {bodyConditionData.volume.toFixed(2)} m³
              </p>
            )}
            {bodyConditionData.areaIndex && (
              <p>
                <strong>Body Area Index:</strong> {bodyConditionData.areaIndex.toFixed(2)}
              </p>
            )}
            {bodyConditionData.surfaceArea && (
              <p>
                <strong>Surface Area:</strong> {bodyConditionData.surfaceArea.toFixed(2)} m²
              </p>
            )}
            {bodyConditionData.fullResults && Object.entries(bodyConditionData.fullResults)
              .filter(([key, value]) => 
                !['Image', 'Image_ID'].includes(key) && 
                value !== null && 
                !isNaN(value) &&
                !key.startsWith('Length_w') &&
                !key.startsWith('Width_')
              )
              .map(([key, value]) => (
                <p key={key}>
                  <strong>{key}:</strong> {typeof value === 'number' ? value.toFixed(2) : value}
                </p>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}