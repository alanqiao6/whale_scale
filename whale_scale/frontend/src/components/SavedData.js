// File: SavedData.js
// Purpose: Component to display and manage saved measurements and images
// FIXED: Use metadata whale name instead of filename for grouping

import React, { useState, useEffect } from "react";
import "./SavedData.css";

export default function SavedData({ onLoadMeasurement, onLoadImage }) {
  const [savedImages, setSavedImages] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [imageMeasurements, setImageMeasurements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [groupByWhale, setGroupByWhale] = useState(true);
  const [whaleGroups, setWhaleGroups] = useState({});

  useEffect(() => {
    fetchSavedImages();
  }, []);

  // Group images by whale name when data changes
  useEffect(() => {
    if (savedImages.length > 0) {
      groupImagesByWhale();
    }
  }, [savedImages]);

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

  // FIXED: Extract whale info with priority to metadata over filename
  const extractWhaleInfo = (image) => {
    // First priority: Check if we have whale metadata from measurements
    if (image.whaleMetadata) {
      const metadata = image.whaleMetadata;
      if (metadata.whale_name) {
        // Extract number from whale_id if available, otherwise default to 1
        const whaleNumber = metadata.whale_id ? 
          metadata.whale_id.replace(metadata.whale_name, '') || "1" : "1";
        
        return {
          whaleName: metadata.whale_name,
          whaleNumber: whaleNumber,
          source: 'metadata'
        };
      }
      
      if (metadata.whale_id) {
        // Try to extract name and number from whale_id
        const match = metadata.whale_id.match(/^([A-Za-z_]+)(\d*)$/);
        if (match) {
          return {
            whaleName: match[1],
            whaleNumber: match[2] || "1",
            source: 'metadata'
          };
        }
        
        return {
          whaleName: metadata.whale_id,
          whaleNumber: "1",
          source: 'metadata'
        };
      }
    }
    
    // Fallback: Extract from filename
    const filename = image.filename || image.original_filename;
    if (!filename) {
      return { whaleName: "Unknown", whaleNumber: "1", source: 'fallback' };
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
          source: 'filename'
        };
      }
    }

    // Fallback: treat entire name as whale name
    return {
      whaleName: nameWithoutExt,
      whaleNumber: "1",
      source: 'filename'
    };
  };

  // FIXED: Group images using metadata-first whale extraction
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

  // FIXED: Render whale-grouped view with metadata-based naming
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
                
                // Show source indicator for debugging
                const sourceIndicator = whaleInfo.source === 'metadata' ? '✅' : 
                                      whaleInfo.source === 'filename' ? '📄' : '❓';
                
                return (
                  <div 
                    key={image.id} 
                    className={`image-card whale-image-card ${selectedImageId === image.id ? 'selected' : ''}`}
                    onClick={() => fetchImageMeasurements(image.id)}
                  >
                    <div className="image-info">
                      <h5>{sourceIndicator} {displayName}</h5>
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

  // Render standard list view
  const renderStandardView = () => {
    if (savedImages.length === 0) {
      return <p>No saved images found. Upload and analyze some images to see them here!</p>;
    }

    return (
      <div className="images-grid">
        {savedImages.map((image) => {
          const whaleInfo = extractWhaleInfo(image);
          const displayName = `${whaleInfo.whaleName}${whaleInfo.whaleNumber}`;
          const sourceIndicator = whaleInfo.source === 'metadata' ? '✅' : 
                                whaleInfo.source === 'filename' ? '📄' : '❓';
          
          return (
            <div 
              key={image.id} 
              className={`image-card ${selectedImageId === image.id ? 'selected' : ''}`}
              onClick={() => fetchImageMeasurements(image.id)}
            >
              <div className="image-info">
                <h4>{sourceIndicator} {displayName}</h4>
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
          {imageMeasurements.length === 0 ? (
            <p>No measurements found for this image.</p>
          ) : (
            <div className="measurements-grid">
              {imageMeasurements.map((measurement) => {
                const typeDisplay = getMeasurementTypeDisplay(measurement);
                const isRulerComplete = measurement.measurement_type === 'ruler_complete';
                
                return (
                  <div key={measurement.id} className={`measurement-card ${isRulerComplete ? 'ruler-complete' : ''}`}>
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
          )}
        </div>
      )}
    </div>
  );
}