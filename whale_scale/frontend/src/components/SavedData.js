// File: SavedData.js
// Purpose: Component to display and manage saved measurements and images

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
              {imageMeasurements.map((measurement) => (
                <div key={measurement.id} className="measurement-card">
                  <div className="measurement-header">
                    <span className="measurement-type">
                      {measurement.measurement_type === 'TL' && '📏 Total Length'}
                      {measurement.measurement_type.startsWith('TL_w') && '📐 Width Segment'}
                      {measurement.measurement_type === 'curve_length' && '✏️ Manual Curve'}
                      {measurement.measurement_type === 'area' && '🔲 Area'}
                      {measurement.measurement_type === 'angle' && '📐 Angle'}
                      {!['TL', 'curve_length', 'area', 'angle'].includes(measurement.measurement_type) && 
                       !measurement.measurement_type.startsWith('TL_w') && measurement.measurement_type}
                    </span>
                    <span className="measurement-date">
                      {formatDate(measurement.created_date)}
                    </span>
                  </div>
                  
                  <div className="measurement-details">
                    {measurement.measurement_name && (
                      <p><strong>Name:</strong> {measurement.measurement_name}</p>
                    )}
                    <p><strong>Value:</strong> {measurement.scaled_dimension?.toFixed(4) || 'N/A'}</p>
                    {measurement.measurement_type === 'area' && (
                      <p><strong>Unit:</strong> m²</p>
                    )}
                    {measurement.measurement_type === 'angle' && (
                      <p><strong>Unit:</strong> degrees</p>
                    )}
                    {(measurement.measurement_type === 'TL' || 
                      measurement.measurement_type.startsWith('TL_w') ||
                      measurement.measurement_type === 'curve_length') && (
                      <p><strong>Unit:</strong> meters</p>
                    )}
                  </div>
                  
                  <button 
                    className="load-measurement-btn"
                    onClick={() => handleLoadMeasurement(measurement)}
                  >
                    Load into Viewer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}