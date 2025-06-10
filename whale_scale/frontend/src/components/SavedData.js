// File: SavedData.js
// Purpose: Component to display and manage saved measurements and images
// UPDATED: Now handles grouped ruler measurements with width segments

import React, { useState, useEffect } from "react";
import "./SavedData.css";

export default function SavedData({ onLoadMeasurement, onLoadImage }) {
  const [savedImages, setSavedImages] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [imageMeasurements, setImageMeasurements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSavedImages();
  }, []);

  const fetchSavedImages = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/collatrix/get_user_images/", {
        method: "GET",
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedImages(data.images);
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

  // NEW: Function to get measurement type icon and label
  const getMeasurementTypeDisplay = (measurement) => {
    switch (measurement.measurement_type) {
      case 'ruler_complete':
        const segmentCount = measurement.metadata?.segment_count || 0;
        return {
          icon: '📏',
          label: `Complete Ruler Measurement (${segmentCount} segments)`,
          unit: 'meters'
        };
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

  // NEW: Function to render ruler measurement details
  const renderRulerDetails = (measurement) => {
    const metadata = measurement.metadata || {};
    const totalLength = metadata.total_length || {};
    const widthSegments = metadata.width_segments || [];

    return (
      <div className="ruler-details">
        <div className="ruler-summary">
          <p><strong>Total Length:</strong> {totalLength.scaled_dimension?.toFixed(4) || measurement.scaled_dimension?.toFixed(4) || 'N/A'} meters</p>
          <p><strong>Width Segments:</strong> {widthSegments.length}</p>
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

  if (loading) {
    return <div className="saved-data-loading">Loading saved data...</div>;
  }

  if (error) {
    return <div className="saved-data-error">Error: {error}</div>;
  }

  return (
    <div className="saved-data-container">
      <h2>Saved Images & Measurements</h2>
      
      <div className="saved-images-list">
        <h3>Your Images ({savedImages.length})</h3>
        {savedImages.length === 0 ? (
          <p>No saved images found. Upload and analyze some images to see them here!</p>
        ) : (
          <div className="images-grid">
            {savedImages.map((image) => (
              <div 
                key={image.id} 
                className={`image-card ${selectedImageId === image.id ? 'selected' : ''}`}
                onClick={() => fetchImageMeasurements(image.id)}
              >
                <div className="image-info">
                  <h4>{image.filename}</h4>
                  <p className="image-date">{formatDate(image.upload_date)}</p>
                  <div className="image-metadata">
                    <span>📏 {image.measurement_count} measurements</span>
                    {image.camera_make && <span>📷 {image.camera_make} {image.camera_model}</span>}
                    {image.focal_length_mm && <span>🔍 {image.focal_length_mm}mm</span>}
                    {image.gps_altitude_m && <span>✈️ {image.gps_altitude_m}m</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                      
                      {/* Render ruler details specially */}
                      {isRulerComplete ? (
                        renderRulerDetails(measurement)
                      ) : (
                        <>
                          <p><strong>Value:</strong> {measurement.scaled_dimension?.toFixed(4) || 'N/A'}</p>
                          <p><strong>Unit:</strong> {typeDisplay.unit}</p>
                        </>
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