// File: app.js
// Authors: Alan Qiao, August Hao, Ciaran Burr
// Purpose: Serves as the main React component for the WhaleScale frontend.
// FIXED: Proper whale name persistence to database

"use client"
import React, { useState, useEffect } from "react"
import Sidebar from "./components/Sidebar"
import TopBar from "./components/TopBar"
import ImageViewer from "./components/ImageViewer"
import Data from "./components/Data"
import About from "./components/About"
import SavedData from "./components/SavedData"
import "./App.css"
import * as exifr from "exifr"

// Utility function to get cookie value
const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

export default function App() {
  const [activeTab, setActiveTab] = useState("measure")
  const [activeTool, setActiveTool] = useState(null)
  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [metadata, setMetadata] = useState({ focalLength: "", altitude: "" })
  const [formData, setFormData] = useState({
    focalLength: "",
    altitude: "",
    altitudeOffset: "",
    imageWidth: "",
    imageHeight: "",
    fov: "",
    sensorWidth: "",
    widthSegments: "",
    crosshairSize: 50,
    crosshairOpacity: 100,
    segmentColor: "#FFFFC5",
    crosshairColor: "#FF0000",
    whaleName: ""
  })
  const [widthSegments, setWidthSegments] = useState(null)
  const [rulerData, setRulerData] = useState(null)
  const [manualCurveData, setManualCurveData] = useState(null)
  const [areaData, setAreaData] = useState(null)
  const [angleData, setAngleData] = useState(null)
  const [bodyConditionData, setBodyConditionData] = useState(null)
  const [backendResult, setBackendResult] = useState(null)
  const [backendMessage, setBackendMessage] = useState("")
  const [pixelDimension, setPixelDimension] = useState(null)
  const [sidebarSubmitted, setSidebarSubmitted] = useState(false)
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false)
  const [savedDataVisible, setSavedDataVisible] = useState(false)
  
  const [currentWhaleId, setCurrentWhaleId] = useState(null)
  const [imageId, setImageId] = useState(null)

  // FIXED: Function to clear all measurement data and active tools
  const clearAllMeasurementData = () => {
    setRulerData(null);
    setManualCurveData(null);
    setAreaData(null);
    setAngleData(null);
    setBodyConditionData(null);
    setBackendResult(null);
    setBackendMessage("");
    setSidebarSubmitted(false);
    setActiveTool(null);
    setPixelDimension(null);
    console.log("Cleared all measurement data and active tools for new image");
  };

  // NEW: Function to save whale name and ID to database immediately
  const saveWhaleNameToDatabase = async (whaleName, whaleId, imageId) => {
    try {
      console.log(`Saving whale name "${whaleName}" and ID "${whaleId}" to database for image ${imageId}`);
      
      const response = await fetch("/api/collatrix/update_whale_info/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie('csrftoken') || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          image_id: imageId,
          whale_name: whaleName,
          whale_id: whaleId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Whale info saved to database:", result);
        return true;
      } else {
        console.error("Failed to save whale info to database:", response.status);
        return false;
      }
    } catch (error) {
      console.error("Error saving whale info to database:", error);
      return false;
    }
  };

  const generateWhaleId = async (whaleName, imageFilename) => {
    try {
      // If no whale name provided, use filename without extension
      if (!whaleName || whaleName.trim() === "") {
        const baseFilename = imageFilename ? 
          imageFilename.replace(/\.[^/.]+$/, '') : "unnamed_whale";
        return `${baseFilename}1`;
      }
      
      const cleanName = whaleName.trim();
      
      // Wait a bit for any pending measurements to save
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then check images
      const response = await fetch("/api/collatrix/get_user_images/", {
        method: "GET",
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        const images = data.images || [];
        
        const allWhaleIds = [];
        
        // Check ALL images for whale names
        for (const image of images) {
          try {
            const measurementResponse = await fetch(`/api/collatrix/get_image_measurements/?image_id=${image.id}`, {
              method: "GET",
              credentials: 'include',
            });
            
            if (measurementResponse.ok) {
              const measurementData = await measurementResponse.json();
              const measurements = measurementData.measurements || [];
              
              measurements.forEach(measurement => {
                let metadata = measurement.metadata || measurement.measurement_metadata || {};
                
                if (typeof metadata === 'string') {
                  try {
                    metadata = JSON.parse(metadata);
                  } catch (e) {
                    metadata = {};
                  }
                }
                
                if (metadata.whale_name && metadata.whale_name.toLowerCase() === cleanName.toLowerCase() && metadata.whale_id) {
                  console.log(`Found whale: ${metadata.whale_name} with ID: ${metadata.whale_id}`);
                  allWhaleIds.push(metadata.whale_id);
                }
              });
            }
          } catch (error) {
            console.error(`Error checking image ${image.id}:`, error);
          }
        }
        
        // ALSO check the database whale_name field directly
        images.forEach(image => {
          if (image.whale_name && image.whale_name.toLowerCase() === cleanName.toLowerCase() && image.whale_id) {
            console.log(`Found whale in database: ${image.whale_name} with ID: ${image.whale_id}`);
            allWhaleIds.push(image.whale_id);
          }
        });
        
        console.log(`All whale IDs found for "${cleanName}":`, allWhaleIds);
        
        // Extract numbers
        const existingNumbers = allWhaleIds
          .map(whaleId => {
            const match = whaleId.match(/(\d+)$/);
            return match ? parseInt(match[1]) : 1;
          })
          .sort((a, b) => a - b);
        
        console.log(`Existing numbers:`, existingNumbers);
        
        // Find next number
        let nextNumber = 1;
        for (const num of existingNumbers) {
          if (num === nextNumber) {
            nextNumber++;
          } else {
            break;
          }
        }
        
        const whaleId = `${cleanName}${nextNumber}`;
        console.log(`Generated whale ID: ${whaleId}`);
        return whaleId;
      }
    } catch (error) {
      console.error("Error:", error);
    }
    
    // Fallback: just use the name with "1"
    const cleanName = whaleName?.trim() || "unnamed_whale";
    return `${cleanName}1`;
  };

  // Handle real-time input changes from Sidebar
  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (name === "widthSegments") {
      setWidthSegments(value !== "" ? Number.parseInt(value) : null)
    }
    if (["focalLength", "altitude", "altitudeOffset", "imageWidth", "imageHeight", "fov", "sensorWidth"].includes(name)) {
      setMetadata(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  // FIXED: Updated handleImageUpload to clear whale name when switching images
  const handleImageUpload = async (file) => {
    if (file) {
      // FIRST: Clear all existing measurement data when new image is uploaded
      clearAllMeasurementData();
      
      const imageUrl = URL.createObjectURL(file)
      setImage(imageUrl)
      setImageFile(file)
      
      // CLEAR whale name and ID when switching to new image
      setCurrentWhaleId(null);
      setFormData(prev => ({
        ...prev,
        whaleName: "" // Clear whale name for new image
      }));
      
      // Start loading state
      setIsExtractingMetadata(true)

      try {
        const formDataUpload = new FormData()
        formDataUpload.append("image", file)

        const response = await fetch("/api/collatrix/extract_metadata/", {
          method: "POST",
          body: formDataUpload,
        })

        if (response.ok) {
          const backendMetadata = await response.json()
          console.log("Backend Metadata:", backendMetadata)

          // Store the image ID for future reference
          setImageId(backendMetadata.image_id);

          const newMetadata = {
            focalLength: backendMetadata.focal_length_mm || "",
            altitude: backendMetadata.gps_altitude_m || "",
            imageWidth: backendMetadata.image_width || "",
            imageHeight: backendMetadata.image_height || "",
            fov: backendMetadata.field_of_view_deg || "",
            sensorWidth: backendMetadata.sensor_width || ""
          }

          setMetadata(newMetadata)
          
          // Also update these values in formData
          setFormData(prev => ({
            ...prev,
            ...newMetadata
          }))

          console.log("Image uploaded and metadata extracted. Ready for whale naming...");
        } 
      } catch (error) {
        console.error("Error extracting metadata via backend:", error)
      } finally {
        // End loading state
        setIsExtractingMetadata(false)
      }
    }
  }

  // NEW: Effect to handle whale name changes and immediately save to database
  useEffect(() => {
    const saveWhaleNameWithDelay = async () => {
      // Only proceed if we have an image loaded and a whale name
      if (!imageId || !formData.whaleName || formData.whaleName.trim() === "") {
        return;
      }

      // Generate whale ID
      const whaleId = await generateWhaleId(formData.whaleName, imageFile?.name);
      setCurrentWhaleId(whaleId);
      
      // IMMEDIATELY save to database
      const saved = await saveWhaleNameToDatabase(formData.whaleName, whaleId, imageId);
      if (saved) {
        console.log(`✅ Whale "${formData.whaleName}" (${whaleId}) permanently saved to database`);
      } else {
        console.error(`❌ Failed to save whale "${formData.whaleName}" to database`);
      }
    };

    // Debounce the save operation to avoid too many API calls
    const timeoutId = setTimeout(saveWhaleNameWithDelay, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [formData.whaleName, imageId, imageFile?.name]);

  const [measurementData, setMeasurementData] = useState(null)

  const handleMeasurementUpdate = (data) => {
    setMeasurementData(data)
  }

  const handleSubmit = async (dataFromSidebar) => {
    // We already have updated formData from input changes, 
    // but this ensures consistency
    setFormData(dataFromSidebar)
    setSidebarSubmitted(true)

    // Generate whale ID when submitting if not already generated
    if (!currentWhaleId && imageFile) {
      const whaleId = await generateWhaleId(dataFromSidebar.whaleName, imageFile.name);
      setCurrentWhaleId(whaleId);
      
      // Save to database immediately
      if (imageId) {
        await saveWhaleNameToDatabase(dataFromSidebar.whaleName, whaleId, imageId);
      }
    }

    if (dataFromSidebar.pixelDimension) {
      setPixelDimension(dataFromSidebar.pixelDimension)
    }
    
    // No need to set width segments here as it's already set via handleInputChange
    // But we'll keep it for safety
    if (dataFromSidebar.widthSegments !== formData.widthSegments) {
      setWidthSegments(Number.parseInt(dataFromSidebar.widthSegments) || null)
    }

    // Update metadata with form data
    setMetadata(prev => ({
      ...prev,
      ...dataFromSidebar
    }))

    // Submit measurement to backend
    if (!measurementData || measurementData.points.length < 2) {
      console.error("Not enough points to submit a measurement.")
      return
    }

    try {
      const response = await fetch("/api/morphometrix/calculate_length/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          measurement: {
            measurement_type: "line",
            measurement_name: "User Line",
            objects_params: [
              {
                type: 1,
                parms: {
                  x1: measurementData.points[0].x,
                  y1: measurementData.points[0].y,
                  x2: measurementData.points[1].x,
                  y2: measurementData.points[1].y,
                  length: measurementData.length,
                },
              },
            ],
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Line measurement result:", result)
      } else {
        console.error("Measurement submission failed:", response.statusText)
      }
    } catch (error) {
      console.error("Error submitting measurement:", error)
    }
  }

  // UPDATED: Modified saveMeasurementToDatabase to include whale name
  const saveMeasurementToDatabase = async (measurement) => {
    try {
      // Use currentWhaleId or generate one if not available
      let subjectName = currentWhaleId;
      if (!subjectName && imageFile) {
        subjectName = await generateWhaleId(formData.whaleName, imageFile.name);
        setCurrentWhaleId(subjectName);
      }
      if (!subjectName) {
        subjectName = imageFile?.name || "unnamed_whale";
      }

      // For ruler_complete measurements, pass the metadata directly
      const measurementPayload = {
        measurement_type: measurement.measurement_type,
        measurement_name: measurement.measurement_name || "User Measurement",
        scaled_dimension: measurement.scaled_dimension || 0,
        coordinate_data: measurement.coordinate_data || [],
        // Pass the metadata directly (especially for ruler_complete measurements)
        metadata: {
          ...measurement.metadata,
          whale_name: formData.whaleName || (imageFile?.name ? imageFile.name.replace(/\.[^/.]+$/, '') : null),
          whale_id: subjectName,
          subject_name: subjectName,
          user_image_path: measurement.user_image_path,
          image_timestamp: measurement.image_timestamp,
          measurement_timestamp: measurement.measurement_timestamp
        }
      };

      console.log("Saving measurement payload:", measurementPayload); // Debug log

      const response = await fetch("/api/collatrix/save_measurement/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Ensure CSRF token is included if needed
          "X-CSRFToken": getCookie('csrftoken') || '',
        },
        credentials: 'include', // Important for session handling
        body: JSON.stringify(measurementPayload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Measurement saved successfully:", result);
        return result;
      } else {
        const errorText = await response.text();
        console.error("Failed to save measurement:", response.status, errorText);
        throw new Error(`Failed to save measurement: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving measurement:", error);
      // Don't throw the error to prevent breaking the main flow
      // Just log it for debugging purposes
    }
  };

  // REST OF THE CODE REMAINS THE SAME...
  // [Include all the other handler functions like handleBackendResult, handleLoadSavedMeasurement, etc.]
  
  // UPDATED: Modified handleBackendResult to use whale ID for subject name
  const handleBackendResult = (result) => {
    console.log("Backend result received:", result);
    setBackendResult(result);

    // Use currentWhaleId as subject name
    const subjectName = currentWhaleId || 
                       (formData.whaleName ? formData.whaleName + "1" : null) ||
                       (imageFile?.name ? imageFile.name.replace(/\.[^/.]+$/, '') : "unnamed_whale");

    // Use measurement_type instead of type
    if (result.measurement_type === "curve_length") {
      // Save manual curve measurements immediately
      const enhancedResult = {
        ...result,
        subject_name: subjectName
      };
      saveMeasurementToDatabase(enhancedResult);
      
      setManualCurveData({
        type: "manual_curve",
        curveLength: result.scaled_dimension,
        curvePoints: result.coordinate_data,
      });
    } else if (result.measurement_type === "TL" || result.measurement_type.startsWith("TL_w")) {
      // Handle ruler measurements (TL = Total Length, TL_w* = width segments)
      if (result.measurement_type === "TL") {
        // This is the main ruler line
        const expectedSegments = Number.parseInt(formData.widthSegments) || 0;
        
        if (expectedSegments === 0) {
          // No width segments expected - save immediately as simple ruler
          const simpleRulerMeasurement = {
            ...result,
            measurement_type: "ruler",
            measurement_name: "Total Length Measurement",
            subject_name: subjectName
          };
          saveMeasurementToDatabase(simpleRulerMeasurement);
          
          setRulerData({
            type: "ruler",
            curveLength: result.scaled_dimension,
            widthSegments: [],
            segments: 0,
          });
        } else {
          // Width segments expected - store temporarily, DON'T SAVE YET
          setRulerData({
            type: "ruler",
            curveLength: result.scaled_dimension,
            widthSegments: [],
            segments: expectedSegments,
            totalLengthResult: {
              ...result,
              subject_name: subjectName
            }, // Store for later saving
          });
        }
      } else {
        // This is a width segment (TL_w5.00, TL_w10.00, etc.)
        setRulerData(prev => {
          if (!prev) return null;
          
          // Extract percentage from measurement_type (e.g., "TL_w5.00" -> 5.00)
          const percentage = result.measurement_type.replace("TL_w", "");
          
          const newSegment = {
            index: percentage,
            length: result.scaled_dimension.toFixed(4),
            coords: result.coordinate_data,
            result: {
              ...result,
              subject_name: subjectName
            } // Store the individual segment result
          };
          
          const updatedWidthSegments = [...(prev.widthSegments || []), newSegment];
          const expectedSegments = prev.segments;
          
          // Check if we have collected all expected width segments
          if (updatedWidthSegments.length === expectedSegments && expectedSegments > 0 && prev.totalLengthResult) {
            // Save the complete ruler measurement with all width segments
            const completeRulerMeasurement = {
              measurement_type: "ruler_complete",
              measurement_name: `${subjectName} - Ruler with ${expectedSegments} Width Segments`,
              scaled_dimension: prev.totalLengthResult.scaled_dimension,
              coordinate_data: prev.totalLengthResult.coordinate_data,
              metadata: {
                total_length: prev.totalLengthResult,
                width_segments: updatedWidthSegments.map(seg => seg.result),
                segment_count: expectedSegments,
                whale_name: formData.whaleName || (imageFile?.name ? imageFile.name.replace(/\.[^/.]+$/, '') : null),
                whale_id: subjectName,
                subject_name: subjectName,
                user_image_path: prev.totalLengthResult.user_image_path,
                image_timestamp: prev.totalLengthResult.image_timestamp,
                measurement_timestamp: new Date().toISOString()
              }
            };
            
            // Save the complete measurement
            saveMeasurementToDatabase(completeRulerMeasurement);
          }
          
          return {
            ...prev,
            widthSegments: updatedWidthSegments
          };
        });
      }
    } else if (result.measurement_type === "area") {
      // Save area measurements immediately
      const enhancedResult = {
        ...result,
        subject_name: subjectName
      };
      saveMeasurementToDatabase(enhancedResult);
      
      setAreaData({
        type: "area",
        area: result.scaled_dimension,
        polygonPoints: result.coordinate_data,
      });
    } else if (result.measurement_type === "angle") {
      // Save angle measurements immediately
      const enhancedResult = {
        ...result,
        subject_name: subjectName
      };
      saveMeasurementToDatabase(enhancedResult);
      
      setAngleData({
        type: "angle",
        angle: result.scaled_dimension,
        anglePoints: result.coordinate_data,
      });
    }
  };

  // UPDATED: handleLoadSavedMeasurement function for simplified ruler storage
  const handleLoadSavedMeasurement = (measurement) => {
    // FIRST: Clear existing measurement data when loading a saved measurement
    clearAllMeasurementData();
    
    // Helper function to safely parse metadata
    const getMetadata = (measurement) => {
      let metadata = measurement.metadata || measurement.measurement_metadata || {};
      
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.warn("Failed to parse metadata JSON:", metadata);
          metadata = {};
        }
      }
      
      return metadata;
    };
    
    const metadata = getMetadata(measurement);
    
    // Helper function to set whale information
    const setWhaleInfo = (metadata) => {
      if (metadata.whale_name) {
        setFormData(prev => ({
          ...prev,
          whaleName: metadata.whale_name
        }));
      }
      if (metadata.whale_id) {
        setCurrentWhaleId(metadata.whale_id);
      }
    };
    
    // Convert saved measurement back to frontend format
    if (measurement.measurement_type === "ruler_complete") {
      // This is a complete ruler measurement with width segments
      const totalLength = metadata.total_length || {};
      const widthSegments = metadata.width_segments || [];
      
      // Load the main ruler line
      setRulerData({
        type: "ruler",
        curveLength: totalLength.scaled_dimension || measurement.scaled_dimension,
        widthSegments: widthSegments.map(segment => {
          const percentage = segment.measurement_type?.replace("TL_w", "") || "0.00";
          return {
            index: percentage,
            length: segment.scaled_dimension?.toFixed(4) || "0.0000",
            coords: segment.coordinate_data || []
          };
        }),
        segments: widthSegments.length,
      });
      
      setWhaleInfo(metadata);
      setBackendMessage(`✅ Loaded ruler measurement: ${(totalLength.scaled_dimension || measurement.scaled_dimension)?.toFixed(2)}m with ${widthSegments.length} width segments`);
      
    } else if (measurement.measurement_type === "ruler" || measurement.measurement_type === "TL") {
      // This is a simple ruler measurement (just total length)
      setRulerData({
        type: "ruler",
        curveLength: measurement.scaled_dimension,
        widthSegments: [],
        segments: 0,
      });
      
      setWhaleInfo(metadata);
      setBackendMessage(`✅ Loaded total length measurement: ${measurement.scaled_dimension.toFixed(2)}m`);
      
    } else if (measurement.measurement_type === "width_segment") {
      // IGNORE: Individual width segments since they're now part of ruler_complete
      // These shouldn't appear in the UI anymore, but handle gracefully if they do
      setBackendMessage(`ℹ️ Width segments are now part of ruler measurements. Please load the main ruler instead.`);
      return;
      
    } else if (measurement.measurement_type.startsWith("TL_w")) {
      // LEGACY: Old width segment format - also ignore
      setBackendMessage(`ℹ️ Legacy width segment detected. Please use the main ruler measurement instead.`);
      return;
      
    } else if (measurement.measurement_type === "curve_length") {
      setManualCurveData({
        type: "manual_curve",
        curveLength: measurement.scaled_dimension,
        curvePoints: measurement.coordinate_data,
      });
      
      setWhaleInfo(metadata);
      setBackendMessage(`✅ Loaded saved curve: ${measurement.scaled_dimension.toFixed(2)}m`);
      
    } else if (measurement.measurement_type === "area") {
      setAreaData({
        type: "area",
        area: measurement.scaled_dimension,
        polygonPoints: measurement.coordinate_data,
      });
      
      setWhaleInfo(metadata);
      setBackendMessage(`✅ Loaded saved area: ${measurement.scaled_dimension.toFixed(2)}m²`);
      
    } else if (measurement.measurement_type === "angle") {
      setAngleData({
        type: "angle",
        angle: measurement.scaled_dimension,
        anglePoints: measurement.coordinate_data,
      });
      
      setWhaleInfo(metadata);
      setBackendMessage(`✅ Loaded saved angle: ${measurement.scaled_dimension.toFixed(2)}°`);
      
    } else {
      // Handle any other measurement types
      console.warn(`Unknown measurement type: ${measurement.measurement_type}`);
      setBackendMessage(`⚠️ Unknown measurement type: ${measurement.measurement_type}`);
      return;
    }
    
    // Switch to measure tab and close saved data view
    setActiveTab("measure");
    setSavedDataVisible(false);
    
    // Clear the message after a few seconds
    setTimeout(() => {
      setBackendMessage("");
    }, 3000);
  };

// Fixed handleVolumeCalculation function
const handleVolumeCalculation = async () => {
  if (!rulerData || !metadata.focalLength || !metadata.altitude) {
    alert("Please complete a ruler measurement and provide focal length and altitude data first.")
    return
  }

  try {
    // Extract width segments and create proper measurement data
    const widthSegments = rulerData.widthSegments || [];
    
    if (widthSegments.length < 3) {
      alert("Need at least 3 width segments for body condition calculation");
      return;
    }

    // Sort width segments by percentage/position
    const sortedSegments = widthSegments.sort((a, b) => parseFloat(a.index) - parseFloat(b.index));
    
    // Use whale ID as Image_ID and Image name
    const whaleId = currentWhaleId || 
                   (formData.whaleName ? formData.whaleName + "1" : null) ||
                   (imageFile?.name ? imageFile.name.replace(/\.[^/.]+$/, '') : "unnamed_whale");
    
    // Create measurement object with TL and width measurements
    const measurementObj = {
      Image_ID: whaleId,
      Image: whaleId,
      TL: rulerData.curveLength, // Use the actual curve length without division
    };

    // Add width measurements using the actual measurement names
    sortedSegments.forEach(segment => {
      const columnName = `TL_w${parseFloat(segment.index).toFixed(2)}`;
      measurementObj[columnName] = parseFloat(segment.length);
    });

    // Calculate interval and bounds from actual data
    const positions = sortedSegments.map(s => parseFloat(s.index));
    const lower = Math.min(...positions);
    const upper = Math.max(...positions);
    const interval = positions.length > 1 ? (upper - lower) / (positions.length - 1) : 5;

    const measurementData = {
      measurements: [measurementObj],
      bv_method: "Circle",
      bai_method: "Parabola", 
      tl_name: "TL",
      interval: interval,
      lower: lower,
      upper: upper
    };

    console.log("Sending body condition data:", measurementData);

    const response = await fetch("/api/collatrix/calculate_body_condition/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(measurementData),
    });

    if (response.ok) {
      const volumeResults = await response.json();
      console.log("Volume calculation results:", volumeResults);
      
      if (volumeResults && volumeResults.length > 0) {
        const result = volumeResults[0];
        
        // Extract meaningful results (look for non-zero values)
        const bvKey = Object.keys(result).find(k => k.startsWith('BVcir_') && result[k] > 0);
        const baiKey = Object.keys(result).find(k => k.startsWith('BAIpar_') && result[k] > 0);
        const saKey = Object.keys(result).find(k => k.startsWith('SA_') && result[k] > 0);
        
        let resultMessage = `🐋 Body Condition Results for ${whaleId}:\n`;
        
        if (bvKey && result[bvKey] > 0) {
          resultMessage += `**Body Volume (${bvKey}):** ${result[bvKey].toFixed(4)}\n`;
        }
        
        if (baiKey && result[baiKey] > 0) {
          resultMessage += `**Body Area Index (${baiKey}):** ${result[baiKey].toFixed(4)}\n`;
        }
        
        if (saKey && result[saKey] > 0) {
          resultMessage += `**Surface Area (${saKey}):** ${result[saKey].toFixed(4)}\n`;
        }
        
        // If all values are still zero or very small, there might be a data issue
        if (!bvKey && !baiKey && !saKey) {
          resultMessage += "⚠️ All calculated values are zero - check measurement data and units";
          console.warn("All body condition values are zero:", result);
        }
        
        setBackendMessage(resultMessage);
        
        // Store results using the actual keys found
        setBodyConditionData({
          type: "body_condition",
          volume: bvKey ? result[bvKey] : null,
          areaIndex: baiKey ? result[baiKey] : null,
          surfaceArea: saKey ? result[saKey] : null,
          fullResults: result,
          whaleId: whaleId // Store whale ID with body condition data
        });
      } else {
        setBackendMessage("⚠️ Volume calculation completed but no results returned");
      }
    } else {
      const errorText = await response.text();
      console.error("Volume calculation error:", errorText);
      setBackendMessage("❗ Error calculating volume");
    }
  } catch (error) {
    console.error("Error in volume calculation:", error);
    setBackendMessage("❗ Error connecting to backend for volume calculation");
  }
};

  return (
    <div className="app-container">
      <Sidebar 
        metadata={metadata} 
        formData={formData}
        onImageUpload={handleImageUpload} 
        onSubmit={handleSubmit}
        onInputChange={handleInputChange}
        isExtractingMetadata={isExtractingMetadata}
        onShowSavedData={() => setSavedDataVisible(true)}
        currentWhaleId={currentWhaleId}  // Pass current whale ID to sidebar
      />
      <div className="main-content">
        <TopBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          sidebarSubmitted={sidebarSubmitted}
        />
        
        {/* ADD SAVED DATA MODAL HERE */}

        {savedDataVisible && (
          <div className="saved-data-overlay">
            <div className="saved-data-modal">
              <button 
                className="close-saved-data"
                onClick={() => setSavedDataVisible(false)}
                style={{
                  position: "absolute",
                  top: "15px",
                  right: "15px",
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  cursor: "pointer",
                  fontSize: "16px"
                }}
              >
                ×
              </button>
              <SavedData 
                onLoadMeasurement={handleLoadSavedMeasurement}
                currentWhaleId={currentWhaleId}
                formData={formData}
                currentImageId={imageId} 
                key={`${currentWhaleId}-${formData.whaleName}`}
              />
            </div>
          </div>
        )}
        
        {activeTab !== "about" ? (
          <>
            <ImageViewer
              image={image}
              widthSegments={widthSegments}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              onMeasurementUpdate={handleMeasurementUpdate}
              onImageUpload={handleImageUpload}
              onBackendResult={handleBackendResult}
              metadata={metadata}
              segmentColor={formData.segmentColor}
              crosshairColor={formData.crosshairColor}
              crosshairSize={parseInt(formData.crosshairSize) || 10}
              pixelDimension={pixelDimension}
              subjectName={currentWhaleId || 
                          (formData.whaleName ? formData.whaleName + "1" : null) ||
                          (imageFile?.name ? imageFile.name.replace(/\.[^/.]+$/, '') : "unnamed_whale")}
              formData={formData}
            />
            {backendMessage && (
              <p style={{ textAlign: "center", color: "black", fontWeight: "bold", marginTop: "10px" }}>{backendMessage}</p>
            )}

            {rulerData && (
              <button
                onClick={handleVolumeCalculation}
                style={{
                  margin: "10px auto",
                  display: "block",
                  padding: "8px 16px",
                  background: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Calculate Body Volume from Ruler Data
              </button>
            )}

            <Data 
              formData={formData} 
              rulerData={rulerData} 
              manualCurveData={manualCurveData} 
              areaData={areaData}
              angleData={angleData}
              bodyConditionData={bodyConditionData}
              pixelDimension={pixelDimension}
              currentWhaleId={currentWhaleId}  // Pass whale ID to Data component
            />
          </>
        ) : (
          <About />
        )}
      </div>
    </div>
  )
}