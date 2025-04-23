"use client"
import React, { useState, useEffect } from "react"
import Sidebar from "./components/Sidebar"
import TopBar from "./components/TopBar"
import ImageViewer from "./components/ImageViewer"
import Data from "./components/Data"
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

// Improved session ID detection with debugging
const getSessionId = () => {
  // Check all possible Django session cookie names
  const possibleCookieNames = ['sessionid', 'dev_sessionid', 'prod_sessionid', 'csrftoken', 'dev_csrftoken', 'prod_csrftoken'];
  
  // Log all cookies for debugging (name only, not values)
  console.log("Available cookies:", document.cookie.split(';').map(c => c.trim().split('=')[0]));
  
  // Try each cookie name
  for (const cookieName of possibleCookieNames) {
    const cookieValue = getCookie(cookieName);
    if (cookieValue) {
      console.log(`Found session cookie: ${cookieName}`);
      return cookieValue;
    }
  }
  
  console.warn("No session cookie found");
  return null;
};

export default function App() {
  const [activeTab, setActiveTab] = useState("measure")
  const [activeTool, setActiveTool] = useState(null)
  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imageDataUrl, setImageDataUrl] = useState(null) // For storing image as Data URL
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
    segmentColor: "#FFFFC5"
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
  const [user, setUser] = useState(null) // Add user state

  // Simple string hashing function
  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  };

  // Function to save state to localStorage using session cookie
  const saveStateToStorage = () => {
    const sessionId = getSessionId();
    if (!sessionId) return; // Only save if there's a valid session
    
    // Create a hash of the session ID for storage
    const sessionHash = hashString(sessionId);
    console.log(`Saving data with session hash: ${sessionHash}`);
    
    try {
      const dataToSave = {
        formData,
        metadata,
        rulerData,
        manualCurveData,
        areaData,
        angleData,
        bodyConditionData,
        pixelDimension,
        imageDataUrl,
        savedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(`whalescale_data_${sessionHash}`, JSON.stringify(dataToSave));
      console.log("Measurement data saved for session");
    } catch (err) {
      console.error("Error saving state to localStorage:", err);
    }
  };
  
  // Function to load state from localStorage
  const loadStateFromStorage = () => {
    const sessionId = getSessionId();
    if (!sessionId) return false; // No session, no data to load
    
    // Create a hash of the session ID for storage
    const sessionHash = hashString(sessionId);
    console.log(`Looking for data with session hash: ${sessionHash}`);
    
    try {
      const savedData = localStorage.getItem(`whalescale_data_${sessionHash}`);
      if (!savedData) {
        console.log("No saved data found with this session hash");
        return false;
      }
      
      console.log("Found saved data, loading...");
      const data = JSON.parse(savedData);
      
      // Restore state from saved data
      if (data.formData) setFormData(data.formData);
      if (data.metadata) setMetadata(data.metadata);
      if (data.rulerData) setRulerData(data.rulerData);
      if (data.manualCurveData) setManualCurveData(data.manualCurveData);
      if (data.areaData) setAreaData(data.areaData);
      if (data.angleData) setAngleData(data.angleData);
      if (data.bodyConditionData) setBodyConditionData(data.bodyConditionData);
      if (data.pixelDimension) setPixelDimension(data.pixelDimension);

      // Restore image if available
      if (data.imageDataUrl) {
        setImageDataUrl(data.imageDataUrl);
        setImage(data.imageDataUrl);
        
        // Also convert the Data URL back to a File object
        fetch(data.imageDataUrl)
          .then(res => res.blob())
          .then(blob => {
            // Create a File object from the blob
            const fileName = data.formData?.imagePath || "restored-image.jpg";
            const file = new File([blob], fileName, { type: blob.type });
            setImageFile(file);
          })
          .catch(err => console.error("Error restoring image file:", err));
      }

      return true;
    } catch (err) {
      console.error("Error loading state from localStorage:", err);
      return false;
    }
  };
  
  // Function to clear saved state (when a new image is uploaded)
  const clearSavedState = () => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    
    // Create a hash of the session ID for storage (same as in saveStateToStorage)
    const sessionHash = hashString(sessionId);
    
    try {
      localStorage.removeItem(`whalescale_data_${sessionHash}`);
      console.log(`Cleared saved measurement data for session hash: ${sessionHash}`);
    } catch (err) {
      console.error("Error clearing saved state:", err);
    }
  };

  // Check authentication status and load saved data on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${window.location.origin}/accounts/api/user/`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          
          // Load saved state if available
          const loaded = loadStateFromStorage();
          if (!loaded) {
            console.log("No saved data found for this session");
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      }
    };
    
    checkAuth();
  }, []);
  
  // Save state whenever important data changes and we have a session
  useEffect(() => {
    if (getSessionId() && (formData || rulerData || manualCurveData || areaData || angleData || bodyConditionData)) {
      saveStateToStorage();
    }
  }, [
    formData,
    rulerData,
    manualCurveData,
    areaData,
    angleData,
    bodyConditionData,
    pixelDimension,
    imageDataUrl
  ]);

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

  const handleImageUpload = async (file) => {
    if (file) {
      // Clear saved state when a new image is uploaded
      clearSavedState();
      
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);
      setImageFile(file);
      
      // Also convert the image to a Data URL for storage
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageDataUrl(e.target.result);
      };
      reader.readAsDataURL(file);

      // Store image path in formData for CSV export
      setFormData(prev => ({
        ...prev,
        imagePath: file.name
      }));

      try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/collatrix/extract_metadata/", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const backendMetadata = await response.json();
          console.log("Backend Metadata:", backendMetadata);

          const newMetadata = {
            focalLength: backendMetadata.focal_length_mm || "",
            altitude: backendMetadata.gps_altitude_m || "",
            imageWidth: backendMetadata.image_width || "",
            imageHeight: backendMetadata.image_height || "",
            fov: backendMetadata.field_of_view_deg || "",
            sensorWidth: backendMetadata.sensor_width || ""
          };

          setMetadata(newMetadata);
          
          // Also update these values in formData
          setFormData(prev => ({
            ...prev,
            ...newMetadata
          }));
        } 
      } catch (error) {
        console.error("Error extracting metadata via backend:", error);
        // Still try client-side extraction if server throws error
      } 
    }
  };

  const [measurementData, setMeasurementData] = useState(null);

  const handleMeasurementUpdate = (data) => {
    setMeasurementData(data);
  };

  const handleSubmit = async (dataFromSidebar) => {
    // We already have updated formData from input changes, 
    // but this ensures consistency
    setFormData(dataFromSidebar);

    if (dataFromSidebar.pixelDimension) {
      setPixelDimension(dataFromSidebar.pixelDimension);
    }
    
    // No need to set width segments here as it's already set via handleInputChange
    // But we'll keep it for safety
    if (dataFromSidebar.widthSegments !== formData.widthSegments) {
      setWidthSegments(Number.parseInt(dataFromSidebar.widthSegments) || null);
    }

    // Update metadata with form data
    setMetadata(prev => ({
      ...prev,
      ...dataFromSidebar
    }));

    // Submit measurement to backend
    if (!measurementData || measurementData.points.length < 2) {
      console.error("Not enough points to submit a measurement.");
      return;
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
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Line measurement result:", result);
      } else {
        console.error("Measurement submission failed:", response.statusText);
      }
    } catch (error) {
      console.error("Error submitting measurement:", error);
    }
  };

  const handleBackendResult = (result) => {
    setBackendResult(result);

    if (result.type === "manual_curve") {
      setManualCurveData({
        type: "manual_curve",
        curveLength: result.length,
        curvePoints: result.curvePoints,
      });
    } else if (result.type === "ruler") {
      setRulerData({
        type: "ruler",
        curveLength: result.curveLength,
        widthSegments: result.widthSegments ?? [],
        // Use the user-specified number rather than array length
        segments: Number.parseInt(formData.widthSegments) || result.widthSegments?.length || 0,
      });
    } else if (result.type === "area") {
      setAreaData({
        type: "area",
        area: result.area,
        polygonPoints: result.polygonPoints,
      });
    } else if (result.type === "angle") {
      setAngleData({
        type: "angle",
        angle: result.angle,
        anglePoints: result.anglePoints,
      });
    }
  };

  // Function to handle volume calculations using the ruler data
  const handleVolumeCalculation = async () => {
    if (!rulerData || !metadata.focalLength || !metadata.altitude) {
      alert("Please complete a ruler measurement and provide focal length and altitude data first.");
      return;
    }

    try {
      // Generate width positions as percentages of total length (0%, 5%, 10%, etc.)
      const interval = 5;
      const maxPercentage = 30;
      const widthColumns = {};
      
      // Create width columns with proper naming convention (Length_w0.00, Length_w5.00, etc.)
      for (let i = 0; i <= maxPercentage; i += interval) {
        // Format with 2 decimal places (0.00, 5.00, etc.)
        const formattedPos = i.toFixed(2);
        const columnName = `Length_w${formattedPos}`;
        
        // Find the closest width segment to this percentage position
        const segmentIndex = Math.round((i / 100) * rulerData.widthSegments.length);
        const segment = rulerData.widthSegments[segmentIndex < rulerData.widthSegments.length ? segmentIndex : rulerData.widthSegments.length - 1];
        
        // Use the width value from that segment or a default value
        widthColumns[columnName] = segment ? parseFloat(segment.length) / 100 : 0;
      }

      // Format the measurement data for the body condition API
      const measurementData = {
        measurements: [
          {
            Image_ID: imageFile?.name || "current_image",
            Image: imageFile?.name || "current_image",
            Length: rulerData.curveLength / 100, // Convert to realistic units
            ...widthColumns
          }
        ],
        bv_method: "Circle", // Method for body volume calculation
        bai_method: "Parabola", // Method for body area index
        tl_name: "Length", // Name of the total length measurement
        interval: interval, // Width measurement interval
        lower: 0, // Lower bound
        upper: maxPercentage // Upper bound
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
        
        // Check if we got valid results
        if (volumeResults && volumeResults.length > 0) {
          let resultMessage = "✅ Body condition results:";
          
          // Add BV (Body Volume) if available
          if (volumeResults[0].BVcir) {
            resultMessage += ` Volume: ${volumeResults[0].BVcir.toFixed(2)} units³`;
          }
          
          // Add BAI (Body Area Index) if available
          if (volumeResults[0].BAIpar) {
            resultMessage += ` | Area Index: ${volumeResults[0].BAIpar.toFixed(2)}`;
          }
          
          setBackendMessage(resultMessage);
          
          // Store the body condition results in state
          setBodyConditionData({
            type: "body_condition",
            volume: volumeResults[0]?.BVcir,
            areaIndex: volumeResults[0]?.BAIpar,
            surfaceArea: volumeResults[0]?.SA,
            fullResults: volumeResults[0]
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
      />
      <div className="main-content">
        <TopBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
        />
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
          crosshairSize={parseInt(formData.crosshairSize) || 10}
          pixelDimension={pixelDimension}
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
          user={user} // Pass user info to Data component
        />
      </div>
    </div>
  );
}