// File: SavedData.js
// Purpose: Component to display and manage saved measurements and images
// ADDED: Delete functionality for images and measurements
// FIXED: Enhanced current session detection using currentImageId

import React, { useState, useEffect } from "react";
import "./SavedData.css";

export default function SavedData({ onLoadMeasurement, onLoadImage, currentWhaleId, formData, currentImageId}) {
  const [savedImages, setSavedImages] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [imageMeasurements, setImageMeasurements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [groupByWhale, setGroupByWhale] = useState(true);
  const [whaleGroups, setWhaleGroups] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null); // For delete confirmation modal

  useEffect(() => {
    fetchSavedImages();
  }, []);

  // Group images by whale name when data changes
  useEffect(() => {
    if (savedImages.length > 0) {
      console.log('Grouping images with currentImageId:', currentImageId, 'currentWhaleId:', currentWhaleId);
      groupImagesByWhale();
    }
  }, [savedImages, currentWhaleId, formData, currentImageId]);

  const fetchSavedImages = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/collatrix/get_user_images/", {
        method: "GET",
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Fetch measurements for each image to get whale metadata
        const imagesWithMetadata = await Promise.all(
          data.images.map(async (image) => {
            try {
              const measurementResponse = await fetch(`/api/collatrix/get_image_measurements/?image_id=${image.id}`, {
                method: "GET",
                credentials: 'include',
              });
              
              if (measurementResponse.ok) {
                const measurementData = await measurementResponse.json();
                const measurements = measurementData.measurements || [];
                
                // Extract whale metadata from the first measurement that has it 
                let whaleMetadata = null;
                for (const measurement of measurements) {
                  let metadata = measurement.metadata || measurement.measurement_metadata || {};
                  
                  if (typeof metadata === 'string') {
                    try {
                      metadata = JSON.parse(metadata);
                    } catch (e) {
                      metadata = {};
                    }
                  }
                  
                  if (metadata.whale_name || metadata.whale_id) {
                    whaleMetadata = metadata;
                    break;
                  }
                }
                
                return {
                  ...image,
                  whaleMetadata: whaleMetadata
                };
              }
            } catch (error) {
              console.error(`Error fetching measurements for image ${image.id}:`, error);
            }
            
            return image;
          })
        );
        
        setSavedImages(imagesWithMetadata);
      } else {
        setError("Failed to fetch saved images");
      }
    } catch (error) {
      console.error("Error fetching saved images:", error);
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  // Delete image function
  const deleteImage = async (imageId) => {
    try {
      const response = await fetch(`/api/collatrix/delete_image/?image_id=${imageId}`, {
        method: "POST",
        credentials: 'include',
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Image deleted:", result.message);
        
        // Remove from local state
        setSavedImages(prev => prev.filter(img => img.id !== imageId));
        
        // Clear selected image if it was deleted
        if (selectedImageId === imageId) {
          setSelectedImageId(null);
          setImageMeasurements([]);
        }
        
        // Show success message
        setError(null);
        
        return { success: true, message: result.message };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete image');
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      setError(`Failed to delete image: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Delete measurement function
  const deleteMeasurement = async (measurementId) => {
    try {
      const response = await fetch(`/api/collatrix/delete_measurement/?measurement_id=${measurementId}`, {
        method: "POST",
        credentials: 'include',
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Measurement deleted:", result.message);
        
        // Remove from local state
        setImageMeasurements(prev => prev.filter(m => m.id !== measurementId));
        
        // Update image measurement count
        setSavedImages(prev => prev.map(img => {
          if (img.id === selectedImageId) {
            return { ...img, measurement_count: img.measurement_count - 1 };
          }
          return img;
        }));
        
        setError(null);
        return { success: true, message: result.message };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete measurement');
      }
    } catch (error) {
      console.error("Error deleting measurement:", error);
      setError(`Failed to delete measurement: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    
    setLoading(true);
    let result;
    
    if (deleteConfirm.type === 'image') {
      result = await deleteImage(deleteConfirm.id);
    } else if (deleteConfirm.type === 'measurement') {
      result = await deleteMeasurement(deleteConfirm.id);
    }
    
    setLoading(false);
    setDeleteConfirm(null);
    
    if (result.success) {
      // Show success message temporarily
      const successMessage = result.message;
      setError(`✅ ${successMessage}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  // FIXED: Precise current session detection - only the EXACT current image
  const extractWhaleInfo = (image) => {
    // PRIORITY 1: Check if this is THE EXACT current session image
    // Only the exact image ID should be treated as current session
    const isExactCurrentSessionImage = currentImageId && (
      // Must be the exact same image ID as currently loaded
      image.id === currentImageId
    );

    if (isExactCurrentSessionImage && currentWhaleId && formData?.whaleName) {
      // Use current session data for real-time updates - ONLY for the exact current image
      const baseWhaleName = formData.whaleName;
      const whaleNumber = currentWhaleId ? currentWhaleId.replace(baseWhaleName, '') || "1" : "1";
      
      return {
        whaleName: baseWhaleName,
        whaleNumber: whaleNumber,
        source: 'current_session',
        isCurrent: true
      };
    }

    // PRIORITY 2: Check if we have whale metadata from measurements (RESPECT SAVED DATA)
    if (image.whaleMetadata) {
      const metadata = image.whaleMetadata;
      if (metadata.whale_name) {
        // Extract number from whale_id if available, otherwise default to 1
        const whaleNumber = metadata.whale_id ? 
          metadata.whale_id.replace(metadata.whale_name, '') || "1" : "1";
        
        return {
          whaleName: metadata.whale_name,
          whaleNumber: whaleNumber,
          source: 'metadata',
          isCurrent: false
        };
      }
      
      if (metadata.whale_id) {
        // Try to extract name and number from whale_id
        const match = metadata.whale_id.match(/^([A-Za-z_]+)(\d*)$/);
        if (match) {
          return {
            whaleName: match[1],
            whaleNumber: match[2] || "1",
            source: 'metadata',
            isCurrent: false
          };
        }
        
        return {
          whaleName: metadata.whale_id,
          whaleNumber: "1",
          source: 'metadata',
          isCurrent: false
        };
      }
    }

    // PRIORITY 3: Check database whale fields (RESPECT SAVED DATA)
    if (image.whale_name) {
      const whaleNumber = image.whale_id ? 
        image.whale_id.replace(image.whale_name, '') || "1" : "1";
      
      return {
        whaleName: image.whale_name,
        whaleNumber: whaleNumber,
        source: 'database',
        isCurrent: false
      };
    }

    if (image.whale_id) {
      const match = image.whale_id.match(/^([A-Za-z_]+)(\d*)$/);
      if (match) {
        return {
          whaleName: match[1],
          whaleNumber: match[2] || "1",
          source: 'database',
          isCurrent: false
        };
      }
      
      return {
        whaleName: image.whale_id,
        whaleNumber: "1",
        source: 'database',
        isCurrent: false
      };
    }
    
    // FALLBACK: Extract from filename
    const filename = image.filename || image.original_filename;
    if (!filename) {
      return { whaleName: "Unknown", whaleNumber: "1", source: 'fallback', isCurrent: false };
    }

    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    
    // Try to match whale name and number patterns
    const patterns = [
      /^([A-Za-z_]+)(\d+)$/, // Simple pattern: letters + number
      /^([A-Za-z_\s]+?)[\s_-]*(\d+)$/, // Letters with separators + number
    ];

    for (const pattern of patterns) {
      const match = nameWithoutExt.match(pattern);
      if (match) {
        return {
          whaleName: match[1].trim().replace(/[_\s]+$/, ''),
          whaleNumber: match[2],
          source: 'filename',
          isCurrent: false
        };
      }
    }

    // Fallback: treat entire name as whale name
    return {
      whaleName: nameWithoutExt,
      whaleNumber: "1",
      source: 'filename',
      isCurrent: false
    };
  };

  // FIXED: Group images using enhanced whale extraction with session awareness
  const groupImagesByWhale = () => {
    const groups = {};
    
    savedImages.forEach(image => {
      const whaleInfo = extractWhaleInfo(image);
      const whaleName = whaleInfo.whaleName;
      
      if (!groups[whaleName]) {
        groups[whaleName] = [];
      }
      
      groups[whaleName].push({
        ...image,
        whaleInfo: whaleInfo
      });
    });
    
    // Sort images within each group by whale number, then by upload date
    Object.keys(groups).forEach(whaleName => {
      groups[whaleName].sort((a, b) => {
        const numA = parseInt(a.whaleInfo.whaleNumber) || 1;
        const numB = parseInt(b.whaleInfo.whaleNumber) || 1;
        
        if (numA !== numB) {
          return numA - numB; // Sort by whale number ascending
        }
        
        // If same number, sort by upload date (newest first)
        return new Date(b.upload_date) - new Date(a.upload_date);
      });
    });
    
    setWhaleGroups(groups);
  };

  const fetchImageMeasurements = async (imageId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/collatrix/get_image_measurements/?image_id=${imageId}`, {
        method: "GET",
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setImageMeasurements(data.measurements);
        setSelectedImageId(imageId);
      } else {
        setError("Failed to fetch measurements");
      }
    } catch (error) {
      console.error("Error fetching measurements:", error);
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMeasurement = (measurement) => {
    if (onLoadMeasurement) {
      onLoadMeasurement(measurement);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString() + " " + new Date(dateString).toLocaleTimeString();
  };

  // Function to get measurement type icon and label
  const getMeasurementTypeDisplay = (measurement) => {
    // Helper function to safely get metadata
    const getMetadata = (measurement) => {
      let metadata = measurement.metadata || measurement.measurement_metadata || {};
      
      // If metadata is a string, try to parse it
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
    
    switch (measurement.measurement_type) {
      case 'ruler_complete':
        const metadata = getMetadata(measurement);
        const segmentCount = metadata.segment_count || 
                           metadata.width_segments?.length || 
                           0;
        return {
          icon: '📏',
          label: `Ruler Measurement (${segmentCount} segments)`,
          unit: 'meters'
        };
      case 'ruler':
        return { icon: '📏', label: 'Total Length', unit: 'meters' };
      case 'TL':
        return { icon: '📏', label: 'Total Length', unit: 'meters' };
      case 'curve_length':
        return { icon: '✏️', label: 'Manual Curve', unit: 'meters' };
      case 'area':
        return { icon: '🔲', label: 'Area', unit: 'm²' };
      case 'angle':
        return { icon: '📐', label: 'Angle', unit: 'degrees' };
      default:
        if (measurement.measurement_type?.startsWith('TL_w')) {
          return { icon: '📐', label: 'Width Segment', unit: 'meters' };
        }
        return { icon: '📏', label: measurement.measurement_type, unit: 'meters' };
    }
  };

  // Function to render ruler measurement details
  const renderRulerDetails = (measurement) => {
    // Helper function to safely get metadata
    const getMetadata = (measurement) => {
      let metadata = measurement.metadata || measurement.measurement_metadata || {};
      
      // If metadata is a string, try to parse it
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
    const totalLength = metadata.total_length || {};
    const widthSegments = metadata.width_segments || [];
    const segmentCount = metadata.segment_count || widthSegments.length;

    return (
      <div className="ruler-details">
        <div className="ruler-summary">
          <p><strong>Total Length:</strong> {totalLength.scaled_dimension?.toFixed(4) || measurement.scaled_dimension?.toFixed(4) || 'N/A'} meters</p>
          <p><strong>Width Segments:</strong> {segmentCount}</p>
        </div>
        
        {widthSegments.length > 0 && (
          <div className="width-segments-list">
            <h5 style={{ margin: '10px 0 5px 0', fontSize: '14px', color: '#666' }}>Width Segment Details:</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
              {widthSegments.map((segment, index) => {
                const percentage = segment.measurement_type?.replace('TL_w', '') || `${(index + 1) * 25}.00`;
                return (
                  <li key={index} style={{ marginBottom: '3px' }}>
                    <strong>Segment {index + 1} ({percentage}%):</strong> {segment.scaled_dimension?.toFixed(4) || 'N/A'} meters
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // FIXED: Render whale-grouped view with real-time session updates and delete buttons
  const renderWhaleGroupedView = () => {
    const whaleNames = Object.keys(whaleGroups).sort();
    
    if (whaleNames.length === 0) {
      return <p>No saved images found. Upload and analyze some images to see them here!</p>;
    }

    return (
      <div className="whale-groups-container">
        {whaleNames.map(whaleName => (
          <div key={whaleName} className="whale-group">
            <div className="whale-group-header">
              <h4>🐋 {whaleName} ({whaleGroups[whaleName].length} images)</h4>
            </div>
            <div className="whale-images-grid">
              {whaleGroups[whaleName].map((image) => {
                const whaleInfo = image.whaleInfo;
                const displayName = `${whaleInfo.whaleName}${whaleInfo.whaleNumber}`;
                
                // Enhanced source indicator with current session highlight
                const sourceIndicator = whaleInfo.source === 'current_session' ? '🔴' : // Red for current session
                                      whaleInfo.source === 'metadata' ? '✅' : 
                                      whaleInfo.source === 'database' ? '💾' :
                                      whaleInfo.source === 'filename' ? '📄' : '❓';
                
                return (
                  <div 
                    key={image.id} 
                    className={`image-card whale-image-card ${selectedImageId === image.id ? 'selected' : ''} ${whaleInfo.isCurrent ? 'current-session' : ''}`}
                    style={{
                      border: whaleInfo.isCurrent ? '3px solid #2196F3' : '1px solid #ddd',
                      backgroundColor: whaleInfo.isCurrent ? '#f0f8ff' : 'white',
                      position: 'relative'
                    }}
                  >
                    {/* Delete button */}
                    <button
                      className="delete-image-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({
                          type: 'image',
                          id: image.id,
                          name: displayName,
                          details: `${image.measurement_count} measurements`
                        });
                      }}
                      style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        background: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                      }}
                      title={`Delete ${displayName}`}
                    >
                      ×
                    </button>
                    
                    <div className="image-info" onClick={() => fetchImageMeasurements(image.id)}>
                      <h5>
                        {sourceIndicator} {displayName}
                        {whaleInfo.isCurrent && <span style={{ color: '#2196F3', fontSize: '12px', marginLeft: '5px' }}>(Current)</span>}
                      </h5>
                      <p className="image-date">{formatDate(image.upload_date)}</p>
                      <div className="image-metadata">
                        <span>📏 {image.measurement_count} measurements</span>
                        {image.camera_make && <span>📷 {image.camera_make}</span>}
                        {image.focal_length_mm && <span>🔍 {image.focal_length_mm}mm</span>}
                        {image.gps_altitude_m && <span>✈️ {image.gps_altitude_m}m</span>}
                        <span style={{ fontSize: '11px', color: '#666' }}>
                          Source: {whaleInfo.source}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render standard list view with current session awareness and delete buttons
  const renderStandardView = () => {
    if (savedImages.length === 0) {
      return <p>No saved images found. Upload and analyze some images to see them here!</p>;
    }

    return (
      <div className="images-grid">
        {savedImages.map((image) => {
          const whaleInfo = extractWhaleInfo(image);
          const displayName = `${whaleInfo.whaleName}${whaleInfo.whaleNumber}`;
          const sourceIndicator = whaleInfo.source === 'current_session' ? '🔴' :
                                whaleInfo.source === 'metadata' ? '✅' : 
                                whaleInfo.source === 'database' ? '💾' :
                                whaleInfo.source === 'filename' ? '📄' : '❓';
          
          return (
            <div 
              key={image.id} 
              className={`image-card ${selectedImageId === image.id ? 'selected' : ''} ${whaleInfo.isCurrent ? 'current-session' : ''}`}
              style={{
                border: whaleInfo.isCurrent ? '3px solid #2196F3' : '1px solid #ddd',
                backgroundColor: whaleInfo.isCurrent ? '#f0f8ff' : 'white',
                position: 'relative'
              }}
            >
              {/* Delete button */}
              <button
                className="delete-image-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm({
                    type: 'image',
                    id: image.id,
                    name: displayName,
                    details: `${image.measurement_count} measurements`
                  });
                }}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10
                }}
                title={`Delete ${displayName}`}
              >
                ×
              </button>
              
              <div className="image-info" onClick={() => fetchImageMeasurements(image.id)}>
                <h4>
                  {sourceIndicator} {displayName}
                  {whaleInfo.isCurrent && <span style={{ color: '#2196F3', fontSize: '12px', marginLeft: '5px' }}>(Current)</span>}
                </h4>
                <p className="image-date">{formatDate(image.upload_date)}</p>
                <div className="image-metadata">
                  <span>📏 {image.measurement_count} measurements</span>
                  {image.camera_make && <span>📷 {image.camera_make} {image.camera_model}</span>}
                  {image.focal_length_mm && <span>🔍 {image.focal_length_mm}mm</span>}
                  {image.gps_altitude_m && <span>✈️ {image.gps_altitude_m}m</span>}
                  <span style={{ fontSize: '11px', color: '#666' }}>
                    Source: {whaleInfo.source}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <div className="saved-data-loading">Loading saved data...</div>;
  }

  if (error) {
    return <div className="saved-data-error">Error: {error}</div>;
  }

  return (
    <div className="saved-data-container">
      <h2>Saved Images & Measurements</h2>
      
      {/* Enhanced legend for source indicators */}
      <div className="source-legend" style={{ 
        fontSize: '12px', 
        color: '#666', 
        marginBottom: '15px',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px'
      }}>
        <strong>Source Indicators:</strong> 
        <span style={{ marginLeft: '10px' }}>🔴 Current Session</span>
        <span style={{ marginLeft: '10px' }}>✅ Measurement Metadata</span>
        <span style={{ marginLeft: '10px' }}>💾 Database</span>
        <span style={{ marginLeft: '10px' }}>📄 Filename</span>
        <span style={{ marginLeft: '10px' }}>❓ Unknown</span>
      </div>
      
      {/* Toggle for grouping view */}
      <div className="view-controls">
        <button 
          className={`view-toggle ${groupByWhale ? 'active' : ''}`}
          onClick={() => setGroupByWhale(true)}
        >
          🐋 Group by Whale
        </button>
        <button 
          className={`view-toggle ${!groupByWhale ? 'active' : ''}`}
          onClick={() => setGroupByWhale(false)}
        >
          📅 List All Images
        </button>
      </div>
      
      <div className="saved-images-list">
        <h3>Your Images ({savedImages.length})</h3>
        {groupByWhale ? renderWhaleGroupedView() : renderStandardView()}
      </div>

      {selectedImageId && (
        <div className="measurements-list">
          <h3>Measurements for Selected Image</h3>
          {(() => {
            // FILTER OUT individual width segments and legacy TL_w measurements
            const filteredMeasurements = imageMeasurements.filter(measurement => {
              return measurement.measurement_type !== 'width_segment' && 
                     !measurement.measurement_type.startsWith('TL_w');
            });
            
            if (filteredMeasurements.length === 0) {
              return <p>No measurements found for this image.</p>;
            }
            
            return (
              <div className="measurements-grid">
                {filteredMeasurements.map((measurement) => {
                  const typeDisplay = getMeasurementTypeDisplay(measurement);
                  const isRulerComplete = measurement.measurement_type === 'ruler_complete';
                  
                  return (
                    <div key={measurement.id} className={`measurement-card ${isRulerComplete ? 'ruler-complete' : ''}`} style={{ position: 'relative' }}>
                      {/* Delete measurement button */}
                      <button
                        className="delete-measurement-btn"
                        onClick={() => {
                          setDeleteConfirm({
                            type: 'measurement',
                            id: measurement.id,
                            name: `${typeDisplay.label}`,
                            details: `${measurement.scaled_dimension?.toFixed(2) || 'N/A'} ${typeDisplay.unit}`
                          });
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: '#ff4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10
                        }}
                        title={`Delete ${typeDisplay.label}`}
                      >
                        ×
                      </button>
                      
                      <div className="measurement-header">
                        <span className="measurement-type">
                          {typeDisplay.icon} {typeDisplay.label}
                        </span>
                        <span className="measurement-date">
                          {formatDate(measurement.created_date)}
                        </span>
                      </div>
                      
                      <div className="measurement-details">
                        {measurement.measurement_name && (
                          <p><strong>Name:</strong> {measurement.measurement_name}</p>
                        )}
                        
                        {/* Render ruler details specially  */}
                        {isRulerComplete ? (
                          renderRulerDetails(measurement)
                        ) : (
                          <>
                            <p><strong>Value:</strong> {measurement.scaled_dimension?.toFixed(4) || 'N/A'}</p>
                            <p><strong>Unit:</strong> {typeDisplay.unit}</p>
                          </>
                        )}
                        
                        {/* Show whale information if available */}
                        {measurement.metadata && (
                          (() => {
                            const metadata = typeof measurement.metadata === 'string' 
                              ? (() => {
                                  try { return JSON.parse(measurement.metadata); }
                                  catch (e) { return {}; }
                                })()
                              : measurement.metadata;
                            
                            return (metadata.whale_name || metadata.whale_id) && (
                              <div className="whale-info-in-measurement">
                                {metadata.whale_name && <p><strong>Whale:</strong> {metadata.whale_name}</p>}
                                {metadata.whale_id && <p><strong>Whale ID:</strong> {metadata.whale_id}</p>}
                              </div>
                            );
                          })()
                        )}
                      </div>
                      
                      <button 
                        className="load-measurement-btn"
                        onClick={() => handleLoadMeasurement(measurement)}
                      >
                        Load into Viewer
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '400px',
            margin: '20px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{ color: '#d32f2f', marginBottom: '15px' }}>🗑️ Confirm Delete</h3>
            <p style={{ color: '#333', marginBottom: '10px', lineHeight: '1.5' }}>
              Are you sure you want to delete this {deleteConfirm.type}?
            </p>
            <p style={{ color: '#666', marginBottom: '20px', fontWeight: 'bold' }}>
              {deleteConfirm.name}
            </p>
            {deleteConfirm.details && (
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                {deleteConfirm.details}
              </p>
            )}
            {deleteConfirm.type === 'image' && (
              <p style={{ color: '#d32f2f', marginBottom: '20px', fontSize: '13px' }}>
                ⚠️ This will also delete all measurements for this image!
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#333'
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#d32f2f',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: loading ? 0.6 : 1
                }}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}