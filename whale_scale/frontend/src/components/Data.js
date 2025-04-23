import "./Data.css"
import React from "react"

export default function Data({ formData, rulerData, manualCurveData, areaData, angleData, bodyConditionData, pixelDimension }) {

  // Function to export data to CSV with a single table format
  const exportDataToCSV = () => {
    console.log("Starting export function...");
    
    // Debug log for all data
    console.log("Export data:", {
      formData,
      rulerData,
      areaData,
      manualCurveData,
      angleData,
      bodyConditionData,
      pixelDimension
    });
    
    // Check if any data exists to export
    if (!formData && !rulerData && !manualCurveData && !areaData && !angleData && !bodyConditionData) {
      alert("No data to export");
      return;
    }
    
    try {
      // Create a data object with all measurements
      const dataObj = {};
      
      // Add form data
      if (formData) {
        dataObj["Focal_Length"] = format(formData.focalLength);
        dataObj["Altitude"] = format(formData.altitude);
        dataObj["Altitude_Offset"] = format(formData.altitudeOffset);
        dataObj["Image_Width"] = format(formData.imageWidth);
        dataObj["Image_Height"] = format(formData.imageHeight);
        dataObj["Field_of_View"] = format(formData.fov);
        dataObj["Sensor_Width"] = format(formData.sensorWidth);
        dataObj["Width_Segments"] = format(formData.widthSegments);
        dataObj["Crosshair_Size"] = format(formData.crosshairSize);
        dataObj["Crosshair_Opacity"] = format(formData.crosshairOpacity);
        dataObj["Segment_Color"] = format(formData.segmentColor);
        dataObj["Pixel_Dimension"] = format(pixelDimension);
      }
      
      // Add ruler data
      if (rulerData) {
        dataObj["Ruler_Type"] = rulerData.type || "ruler";
        dataObj["Ruler_Curve_Length"] = rulerData.curveLength !== undefined ? 
          rulerData.curveLength.toFixed(2) + " m" : "None";
        dataObj["Ruler_Segments"] = rulerData.segments || "None";
        
        // Add width segments data
        if (rulerData.widthSegments && Array.isArray(rulerData.widthSegments)) {
          rulerData.widthSegments.forEach(seg => {
            if (seg && seg.index !== undefined) {
              dataObj[`Width_Segment_${seg.index}_Length`] = seg.length !== undefined ? 
                seg.length + " m" : "None";
              
              // Add coordinates if available
              if (seg.coords) {
                dataObj[`Width_Segment_${seg.index}_X1`] = seg.coords.x1;
                dataObj[`Width_Segment_${seg.index}_Y1`] = seg.coords.y1;
                dataObj[`Width_Segment_${seg.index}_X2`] = seg.coords.x2;
                dataObj[`Width_Segment_${seg.index}_Y2`] = seg.coords.y2;
              }
            }
          });
        }
      }
      
      // Add area data
      if (areaData) {
        dataObj["Area_Size"] = areaData.area !== undefined ? 
          areaData.area.toFixed(2) + " m²" : "None";
        
        if (areaData.polygonPoints && Array.isArray(areaData.polygonPoints)) {
          dataObj["Area_Points_Count"] = areaData.polygonPoints.length;
          
          // Add polygon points coordinates
          areaData.polygonPoints.forEach((point, i) => {
            if (point && point.x !== undefined && point.y !== undefined) {
              dataObj[`Area_Point_${i}_X`] = point.x;
              dataObj[`Area_Point_${i}_Y`] = point.y;
            }
          });
        }
      }
      
      // Add manual curve data
      if (manualCurveData) {
        dataObj["Manual_Curve_Length"] = manualCurveData.curveLength !== undefined ? 
          manualCurveData.curveLength.toFixed(2) + " m" : "None";
        
        if (manualCurveData.curvePoints && Array.isArray(manualCurveData.curvePoints)) {
          dataObj["Manual_Curve_Points_Count"] = manualCurveData.curvePoints.length;
          
          // Add curve points coordinates
          manualCurveData.curvePoints.forEach((point, i) => {
            if (point && point.x !== undefined && point.y !== undefined) {
              dataObj[`Manual_Curve_Point_${i}_X`] = point.x;
              dataObj[`Manual_Curve_Point_${i}_Y`] = point.y;
            }
          });
        }
      }
      
      // Add angle data
      if (angleData) {
        dataObj["Angle_Value"] = angleData.angle !== undefined ? 
          angleData.angle.toFixed(2) + "°" : "None";
        
        if (angleData.anglePoints && Array.isArray(angleData.anglePoints)) {
          dataObj["Angle_Points_Count"] = angleData.anglePoints.length;
          
          // Add angle points coordinates
          angleData.anglePoints.forEach((point, i) => {
            if (point && point.x !== undefined && point.y !== undefined) {
              dataObj[`Angle_Point_${i}_X`] = point.x;
              dataObj[`Angle_Point_${i}_Y`] = point.y;
            }
          });
        }
      }
      
      // Add body condition data
      if (bodyConditionData) {
        if (bodyConditionData.volume !== undefined && !isNaN(bodyConditionData.volume)) {
          dataObj["Body_Volume"] = bodyConditionData.volume.toFixed(2) + " m³";
        }
        
        if (bodyConditionData.areaIndex !== undefined && !isNaN(bodyConditionData.areaIndex)) {
          dataObj["Body_Area_Index"] = bodyConditionData.areaIndex.toFixed(2);
        }
        
        if (bodyConditionData.surfaceArea !== undefined && !isNaN(bodyConditionData.surfaceArea)) {
          dataObj["Surface_Area"] = bodyConditionData.surfaceArea.toFixed(2) + " m²";
        }
        
        // Add additional body condition results
        if (bodyConditionData.fullResults) {
          Object.entries(bodyConditionData.fullResults).forEach(([key, value]) => {
            if (!['Image', 'Image_ID'].includes(key) && 
                value !== null && 
                !isNaN(value) &&
                !key.startsWith('Length_w') &&
                !key.startsWith('Width_')) {
              dataObj[`BC_${key}`] = typeof value === 'number' ? value.toFixed(2) : value;
            }
          });
        }
      }
      
      // Convert to CSV
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Add headers
      const headers = Object.keys(dataObj);
      csvContent += headers.join(",") + "\n";
      
      // Add values (properly handle commas and quotes)
      const values = headers.map(header => {
        const value = dataObj[header];
        if (value === undefined || value === null || value === "") return '""';
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      
      csvContent += values.join(",");
      
      // Log to verify CSV content
      console.log("Data object:", dataObj);
      console.log("Headers:", headers);
      console.log("Values:", values);
      
      // Create filename
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