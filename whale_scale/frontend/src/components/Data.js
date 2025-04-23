import "./Data.css"
import React from "react"

export default function Data({ formData, rulerData, manualCurveData, areaData, angleData, bodyConditionData, pixelDimension }) {

  // Function to export data to CSV with a single table format
  const exportDataToCSV = () => {
    console.log("Starting export function...");
    
    // Check if any data exists to export
    if (!formData && !rulerData && !manualCurveData && !areaData && !angleData && !bodyConditionData) {
      alert("No data to export");
      return;
    }
    
    try {
      // Initialize CSV content with a single header row
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Create a master data object to hold all values
      const masterData = {
        // Form data section
        "Focal_Length": formData ? format(formData.focalLength) : "None",
        "Altitude": formData ? format(formData.altitude) : "None",
        "Altitude_Offset": formData ? format(formData.altitudeOffset) : "None",
        "Image_Width": formData ? format(formData.imageWidth) : "None",
        "Image_Height": formData ? format(formData.imageHeight) : "None",
        "Field_of_View": formData ? format(formData.fov) : "None",
        "Sensor_Width": formData ? format(formData.sensorWidth) : "None",
        "Width_Segments": formData ? format(formData.widthSegments) : "None",
        "Crosshair_Size": formData ? format(formData.crosshairSize) : "None",
        "Crosshair_Opacity": formData ? format(formData.crosshairOpacity) : "None",
        "Segment_Color": formData ? format(formData.segmentColor) : "None",
        "Pixel_Dimension": format(pixelDimension),
        
        // Ruler data section
        "Ruler_Type": rulerData ? (rulerData.type || "ruler") : "None",
        "Ruler_Curve_Length": rulerData && rulerData.curveLength !== undefined ? 
          rulerData.curveLength.toFixed(2) + " m" : "None",
        "Ruler_Segments": rulerData ? format(rulerData.segments) : "None"
      };
      
      // Add ruler width segments data
      if (rulerData && rulerData.widthSegments && Array.isArray(rulerData.widthSegments)) {
        rulerData.widthSegments.forEach((seg, i) => {
          if (seg && seg.length !== undefined) {
            masterData[`Width_Segment_${seg.index}_Length`] = seg.length + " m";
            
            // Add coordinates if available
            if (seg.coords) {
              masterData[`Width_Segment_${seg.index}_X1`] = seg.coords.x1;
              masterData[`Width_Segment_${seg.index}_Y1`] = seg.coords.y1;
              masterData[`Width_Segment_${seg.index}_X2`] = seg.coords.x2;
              masterData[`Width_Segment_${seg.index}_Y2`] = seg.coords.y2;
            }
          }
        });
      }
      
      // Area data section
      if (areaData) {
        masterData["Area_Size"] = areaData.area !== undefined ? 
          areaData.area.toFixed(2) + " m²" : "None";
        masterData["Area_Points_Count"] = areaData.polygonPoints && Array.isArray(areaData.polygonPoints) ? 
          areaData.polygonPoints.length : "None";
        
        // Add polygon points
        if (areaData.polygonPoints && Array.isArray(areaData.polygonPoints)) {
          areaData.polygonPoints.forEach((point, i) => {
            if (point && point.x !== undefined && point.y !== undefined) {
              masterData[`Area_Point_${i}_X`] = point.x;
              masterData[`Area_Point_${i}_Y`] = point.y;
            }
          });
        }
      }
      
      // Manual curve data section
      if (manualCurveData) {
        masterData["Manual_Curve_Length"] = manualCurveData.curveLength !== undefined ? 
          manualCurveData.curveLength.toFixed(2) + " m" : "None";
        masterData["Manual_Curve_Points_Count"] = manualCurveData.curvePoints && Array.isArray(manualCurveData.curvePoints) ? 
          manualCurveData.curvePoints.length : "None";
        
        // Add curve points
        if (manualCurveData.curvePoints && Array.isArray(manualCurveData.curvePoints)) {
          manualCurveData.curvePoints.forEach((point, i) => {
            if (point && point.x !== undefined && point.y !== undefined) {
              masterData[`Manual_Curve_Point_${i}_X`] = point.x;
              masterData[`Manual_Curve_Point_${i}_Y`] = point.y;
            }
          });
        }
      }
      
      // Angle data section
      if (angleData) {
        masterData["Angle_Value"] = angleData.angle !== undefined ? 
          angleData.angle.toFixed(2) + "°" : "None";
        masterData["Angle_Points_Count"] = angleData.anglePoints && Array.isArray(angleData.anglePoints) ? 
          angleData.anglePoints.length : "None";
        
        // Add angle points
        if (angleData.anglePoints && Array.isArray(angleData.anglePoints)) {
          angleData.anglePoints.forEach((point, i) => {
            if (point && point.x !== undefined && point.y !== undefined) {
              masterData[`Angle_Point_${i}_X`] = point.x;
              masterData[`Angle_Point_${i}_Y`] = point.y;
            }
          });
        }
      }
      
      // Body condition data section
      if (bodyConditionData) {
        if (bodyConditionData.volume !== undefined && !isNaN(bodyConditionData.volume)) {
          masterData["Body_Volume"] = bodyConditionData.volume.toFixed(2) + " m³";
        }
        
        if (bodyConditionData.areaIndex !== undefined && !isNaN(bodyConditionData.areaIndex)) {
          masterData["Body_Area_Index"] = bodyConditionData.areaIndex.toFixed(2);
        }
        
        if (bodyConditionData.surfaceArea !== undefined && !isNaN(bodyConditionData.surfaceArea)) {
          masterData["Surface_Area"] = bodyConditionData.surfaceArea.toFixed(2) + " m²";
        }
        
        // Add additional body condition results
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
                masterData[`BC_${key}`] = typeof value === 'number' ? value.toFixed(2) : value;
              });
          } catch (err) {
            console.error("Error processing body condition results:", err);
          }
        }
      }
      
      // Create header row from all keys
      const headers = Object.keys(masterData);
      csvContent += headers.join(",") + "\n";
      
      // Create data row from all values
      const values = headers.map(header => {
        const value = masterData[header];
        // Escape commas and quotes in the value
        if (value !== undefined && value !== null && value !== "") {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
        return "";
      });
      csvContent += values.join(",");
      
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