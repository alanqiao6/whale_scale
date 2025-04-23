import "./Data.css"
import React from "react"

export default function Data({ formData, rulerData, manualCurveData, areaData, angleData, bodyConditionData, pixelDimension }) {

// Function to export data to CSV
const exportDataToCSV = () => {
  console.log("Starting export function...");
  
  // Detailed logging of actual data structures
  console.log("Ruler data details:", JSON.stringify(rulerData, null, 2));
  console.log("Area data details:", JSON.stringify(areaData, null, 2));
  console.log("Manual curve data details:", JSON.stringify(manualCurveData, null, 2));
  console.log("Angle data details:", JSON.stringify(angleData, null, 2));
  console.log("Body condition data details:", JSON.stringify(bodyConditionData, null, 2));
  
  console.log("Available data:", { 
    formData: !!formData, 
    rulerData: !!rulerData, 
    manualCurveData: !!manualCurveData, 
    areaData: !!areaData, 
    angleData: !!angleData, 
    bodyConditionData: !!bodyConditionData 
  });
  
  // Check if any data exists to export
  if (!formData && !rulerData && !manualCurveData && !areaData && !angleData && !bodyConditionData) {
    alert("No data to export");
    return;
  }
  
  try {
    // Initialize CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add form data
    if (formData) {
      csvContent += "Form Data\n";
      csvContent += `Focal Length,${format(formData.focalLength)}\n`;
      csvContent += `Altitude,${format(formData.altitude)}\n`;
      csvContent += `Altitude Offset,${format(formData.altitudeOffset)}\n`;
      csvContent += `Image Width,${format(formData.imageWidth)}\n`;
      csvContent += `Image Height,${format(formData.imageHeight)}\n`;
      csvContent += `Field of View,${format(formData.fov)}\n`;
      csvContent += `Sensor Width,${format(formData.sensorWidth)}\n`;
      csvContent += `Width Segments,${format(formData.widthSegments)}\n`;
      csvContent += `Crosshair Size,${format(formData.crosshairSize)}\n`;
      csvContent += `Crosshair Opacity,${format(formData.crosshairOpacity)}\n`;
      csvContent += `Segment Color,${format(formData.segmentColor)}\n`;
      csvContent += `Pixel Dimension,${format(pixelDimension)}\n\n`;
    }
    
    // Add ruler data with safety checks
    if (rulerData) {
      console.log("Adding ruler data to CSV:", rulerData);
      
      csvContent += "Ruler Measurements\n";
      
      // Check for type property, fallback to "ruler" if missing
      csvContent += `Type,${rulerData.type || 'ruler'}\n`;
      
      // Check if curveLength exists and is a number
      if (rulerData.curveLength !== undefined && !isNaN(rulerData.curveLength)) {
        csvContent += `Curve Length,${rulerData.curveLength.toFixed(2)} m\n`;
      } else {
        csvContent += `Curve Length,Not available\n`;
      }
      
      // Check for segments property
      csvContent += `Segments,${rulerData.segments || 'N/A'}\n\n`;
      
      // Check for widthSegments property
      if (rulerData.widthSegments && Array.isArray(rulerData.widthSegments) && rulerData.widthSegments.length > 0) {
        csvContent += "Width Segment Lengths\n";
        csvContent += "Segment,Length (m)\n";
        
        rulerData.widthSegments.forEach(seg => {
          try {
            if (seg && seg.index !== undefined && seg.length !== undefined) {
              csvContent += `${seg.index},${seg.length}\n`;
            } else if (seg) {
              // Alternative structure (might be different in your app)
              const segmentIndex = Object.keys(seg)[0];
              const segmentLength = seg[segmentIndex];
              if (segmentIndex !== undefined && segmentLength !== undefined) {
                csvContent += `${segmentIndex},${segmentLength}\n`;
              }
            }
          } catch (err) {
            console.error("Error processing segment:", err, seg);
          }
        });
      } else {
        csvContent += "No width segment data available\n";
      }
      csvContent += "\n";
    }
    
    // Add manual curve data
    if (manualCurveData) {
      console.log("Adding manual curve data to CSV:", manualCurveData);
      
      csvContent += "Manual Curve\n";
      
      // Check for curveLength property
      if (manualCurveData.curveLength !== undefined && !isNaN(manualCurveData.curveLength)) {
        csvContent += `Curve Length,${manualCurveData.curveLength.toFixed(2)} m\n`;
      } else {
        csvContent += `Curve Length,Not available\n`;
      }
      
      // Check for curvePoints property
      if (manualCurveData.curvePoints && Array.isArray(manualCurveData.curvePoints)) {
        csvContent += `Points,${manualCurveData.curvePoints.length}\n\n`;
        
        // Add detailed point data
        csvContent += "Point Coordinates\n";
        csvContent += "Index,X,Y\n";
        manualCurveData.curvePoints.forEach((point, index) => {
          if (point && point.x !== undefined && point.y !== undefined) {
            csvContent += `${index},${point.x},${point.y}\n`;
          }
        });
      } else {
        csvContent += `Points,Not available\n`;
      }
      csvContent += "\n";
    }
    
    // Add area data
    if (areaData) {
      console.log("Adding area data to CSV:", areaData);
      
      csvContent += "Area Measurement\n";
      
      // Check for area property
      if (areaData.area !== undefined && !isNaN(areaData.area)) {
        csvContent += `Area,${areaData.area.toFixed(2)} m²\n`;
      } else {
        csvContent += `Area,Not available\n`;
      }
      
      // Check for polygonPoints property
      if (areaData.polygonPoints && Array.isArray(areaData.polygonPoints)) {
        csvContent += `Points,${areaData.polygonPoints.length}\n\n`;
        
        // Add detailed point data
        csvContent += "Polygon Point Coordinates\n";
        csvContent += "Index,X,Y\n";
        areaData.polygonPoints.forEach((point, index) => {
          if (point && point.x !== undefined && point.y !== undefined) {
            csvContent += `${index},${point.x},${point.y}\n`;
          }
        });
      } else {
        csvContent += `Points,Not available\n`;
      }
      csvContent += "\n";
    }
    
    // Add angle data
    if (angleData) {
      console.log("Adding angle data to CSV:", angleData);
      
      csvContent += "Angle Measurement\n";
      
      // Check for angle property
      if (angleData.angle !== undefined && !isNaN(angleData.angle)) {
        csvContent += `Angle,${angleData.angle.toFixed(2)}°\n`;
      } else {
        csvContent += `Angle,Not available\n`;
      }
      
      // Check for anglePoints property
      if (angleData.anglePoints && Array.isArray(angleData.anglePoints)) {
        csvContent += `Points,${angleData.anglePoints.length}\n\n`;
        
        // Add detailed point data
        csvContent += "Angle Point Coordinates\n";
        csvContent += "Index,X,Y\n";
        angleData.anglePoints.forEach((point, index) => {
          if (point && point.x !== undefined && point.y !== undefined) {
            csvContent += `${index},${point.x},${point.y}\n`;
          }
        });
      } else {
        csvContent += `Points,Not available\n`;
      }
      csvContent += "\n";
    }
    
    // Add body condition data
    if (bodyConditionData) {
      console.log("Adding body condition data to CSV:", bodyConditionData);
      
      csvContent += "Body Condition Results\n";
      
      // Check for volume property
      if (bodyConditionData.volume !== undefined && !isNaN(bodyConditionData.volume)) {
        csvContent += `Body Volume,${bodyConditionData.volume.toFixed(2)} m³\n`;
      }
      
      // Check for areaIndex property
      if (bodyConditionData.areaIndex !== undefined && !isNaN(bodyConditionData.areaIndex)) {
        csvContent += `Body Area Index,${bodyConditionData.areaIndex.toFixed(2)}\n`;
      }
      
      // Check for surfaceArea property
      if (bodyConditionData.surfaceArea !== undefined && !isNaN(bodyConditionData.surfaceArea)) {
        csvContent += `Surface Area,${bodyConditionData.surfaceArea.toFixed(2)} m²\n`;
      }
      
      // Check for fullResults property
      if (bodyConditionData.fullResults) {
        try {
          Object.entries(bodyConditionData.fullResults)
            .filter(([key, value]) => 
              !['Image', 'Image_ID'].includes(key) && 
              value !== null && 
              !isNaN(value) &&
              !key.startsWith('Length_w') &&
              !key.startsWith('Width_')
            )
            .forEach(([key, value]) => {
              csvContent += `${key},${typeof value === 'number' ? value.toFixed(2) : value}\n`;
            });
        } catch (err) {
          console.error("Error processing body condition results:", err);
          csvContent += "Error processing detailed body condition data\n";
        }
      }
      csvContent += "\n";
    }
    
    // Create filename with width segments and current date
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const imagePath = formData && formData.imagePath ? formData.imagePath : "image";
    const fileName = `whalescale_${formData ? (formData.widthSegments || "0") : "0"}_${getFileNameFromPath(imagePath)}_${date}.csv`;
    
    console.log("Creating download with filename:", fileName);
    console.log("CSV Content Preview (first 500 chars):", csvContent.substring(0, 500));
    
    // Create download link and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log("Export completed successfully");
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