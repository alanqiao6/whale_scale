// XcertaintyTab.js - Enhanced with measurement selection from saved data

import React, { useState, useEffect } from 'react';
import './XcertaintyTab.css';

const XcertaintyTab = ({ currentWhaleId, formData }) => {
  const [analysisType, setAnalysisType] = useState('independent_length');
  const [parameters, setParameters] = useState({
    niter: 2000,
    thin: 1,
    summary_burn: 0.5
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingAnalyses, setExistingAnalyses] = useState([]);
  
  // NEW: State for measurement selection
  const [savedImages, setSavedImages] = useState([]);
  const [whaleGroups, setWhaleGroups] = useState({});
  const [selectedWhaleId, setSelectedWhaleId] = useState(null);
  const [selectedMeasurements, setSelectedMeasurements] = useState([]);
  const [availableMeasurements, setAvailableMeasurements] = useState([]);
  const [showMeasurementSelector, setShowMeasurementSelector] = useState(false);
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);

  useEffect(() => {
    fetchExistingAnalyses();
    fetchSavedImages();
  }, []);

  // Set current whale as default selection
  useEffect(() => {
    if (currentWhaleId && !selectedWhaleId) {
      setSelectedWhaleId(currentWhaleId);
      loadMeasurementsForWhale(currentWhaleId);
    }
  }, [currentWhaleId]);

  const fetchSavedImages = async () => {
    try {
      const response = await fetch("/api/collatrix/get_user_images/", {
        method: "GET",
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedImages(data.images);
        groupImagesByWhale(data.images);
      }
    } catch (err) {
      console.error('Error fetching saved images:', err);
    }
  };

  const groupImagesByWhale = (images) => {
    const groups = {};
    
    images.forEach(image => {
      const whaleId = image.whale_id || image.whale_name || 'Unknown';
      if (!groups[whaleId]) {
        groups[whaleId] = {
          whale_name: image.whale_name || whaleId,
          whale_id: whaleId,
          images: [],
          total_measurements: 0
        };
      }
      groups[whaleId].images.push(image);
      groups[whaleId].total_measurements += image.measurement_count || 0;
    });
    
    setWhaleGroups(groups);
  };

  const loadMeasurementsForWhale = async (whaleId) => {
    setLoadingMeasurements(true);
    setAvailableMeasurements([]);
    
    try {
      // Get all images for this whale
      const whaleImages = savedImages.filter(img => 
        img.whale_id === whaleId || img.whale_name === whaleId
      );
      
      // Fetch measurements for each image
      const allMeasurements = [];
      for (const image of whaleImages) {
        try {
          const response = await fetch(`/api/collatrix/get_image_measurements/?image_id=${image.id}`, {
            method: "GET",
            credentials: 'include',
          });
          
          if (response.ok) {
            const data = await response.json();
            const measurements = data.measurements || [];
            
            // Filter out individual width segments and add image info
            const filteredMeasurements = measurements
              .filter(m => m.measurement_type !== 'width_segment' && !m.measurement_type.startsWith('TL_w'))
              .map(m => ({
                ...m,
                image_filename: image.filename,
                image_id: image.id,
                image_upload_date: image.upload_date
              }));
            
            allMeasurements.push(...filteredMeasurements);
          }
        } catch (err) {
          console.error(`Error fetching measurements for image ${image.id}:`, err);
        }
      }
      
      setAvailableMeasurements(allMeasurements);
      
      // Auto-select all measurements by default
      setSelectedMeasurements(allMeasurements.map(m => m.id));
      
    } catch (err) {
      console.error('Error loading measurements for whale:', err);
      setError('Failed to load measurements for selected whale');
    } finally {
      setLoadingMeasurements(false);
    }
  };

  const fetchExistingAnalyses = async () => {
    try {
      const response = await fetch('/api/xcertainty/list/', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setExistingAnalyses(data.analyses);
      }
    } catch (err) {
      console.error('Error fetching analyses:', err);
    }
  };

  const runAnalysis = async () => {
    if (!selectedWhaleId) {
      setError('Please select a whale first');
      return;
    }

    if (selectedMeasurements.length === 0) {
      setError('Please select at least one measurement');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        whale_id: selectedWhaleId,
        selected_measurements: selectedMeasurements,
        ...parameters
      };

      // Add subject info for growth curve analysis
      if (analysisType === 'growth_curve') {
        payload.subject_info = {
          Subject: selectedWhaleId,
          Year: new Date().getFullYear(),
          Group: 'default',
          ObservedAge: 1,
          AgeType: 'estimated'
        };
      }

      const response = await fetch(`/api/xcertainty/${analysisType}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken') || '',
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setResults(result);
        fetchExistingAnalyses(); // Refresh the list
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to run analysis: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAnalysis = async (analysisId) => {
    try {
      const response = await fetch(`/api/xcertainty/details/?id=${analysisId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (err) {
      console.error('Error loading analysis:', err);
    }
  };

  const getMeasurementTypeDisplay = (measurement) => {
    switch (measurement.measurement_type) {
      case 'ruler_complete':
        const metadata = typeof measurement.metadata === 'string' 
          ? JSON.parse(measurement.metadata) 
          : measurement.metadata || {};
        const segmentCount = metadata.segment_count || 0;
        return {
          icon: '📏',
          label: `Ruler (${segmentCount} segments)`,
          unit: 'meters'
        };
      case 'ruler':
        return { icon: '📏', label: 'Total Length', unit: 'meters' };
      case 'curve_length':
        return { icon: '✏️', label: 'Manual Curve', unit: 'meters' };
      case 'area':
        return { icon: '🔲', label: 'Area', unit: 'm²' };
      case 'angle':
        return { icon: '📐', label: 'Angle', unit: 'degrees' };
      default:
        return { icon: '📏', label: measurement.measurement_type, unit: 'meters' };
    }
  };

  const renderMeasurementSelector = () => {
    if (!showMeasurementSelector) return null;

    return (
      <div className="measurement-selector-modal">
        <div className="measurement-selector-content">
          <div className="measurement-selector-header">
            <h3>Select Measurements for Analysis</h3>
            <button 
              className="close-selector"
              onClick={() => setShowMeasurementSelector(false)}
            >
              ×
            </button>
          </div>

          <div className="whale-selection">
            <h4>Select Whale:</h4>
            <div className="whale-options">
              {Object.keys(whaleGroups).map(whaleId => {
                const whale = whaleGroups[whaleId];
                return (
                  <button
                    key={whaleId}
                    className={`whale-option ${selectedWhaleId === whaleId ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedWhaleId(whaleId);
                      loadMeasurementsForWhale(whaleId);
                    }}
                  >
                    🐋 {whale.whale_name} ({whale.total_measurements} measurements)
                  </button>
                );
              })}
            </div>
          </div>

          {selectedWhaleId && (
            <div className="measurement-selection">
              <h4>Select Measurements for {whaleGroups[selectedWhaleId]?.whale_name}:</h4>
              
              {loadingMeasurements ? (
                <p>Loading measurements...</p>
              ) : (
                <>
                  <div className="measurement-controls">
                    <button
                      onClick={() => setSelectedMeasurements(availableMeasurements.map(m => m.id))}
                      className="select-all-btn"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedMeasurements([])}
                      className="deselect-all-btn"
                    >
                      Deselect All
                    </button>
                    <span className="selection-count">
                      {selectedMeasurements.length} of {availableMeasurements.length} selected
                    </span>
                  </div>

                  <div className="measurements-list">
                    {availableMeasurements.map(measurement => {
                      const typeDisplay = getMeasurementTypeDisplay(measurement);
                      const isSelected = selectedMeasurements.includes(measurement.id);
                      
                      return (
                        <div
                          key={measurement.id}
                          className={`measurement-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedMeasurements(prev => prev.filter(id => id !== measurement.id));
                            } else {
                              setSelectedMeasurements(prev => [...prev, measurement.id]);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by onClick above
                          />
                          <div className="measurement-info">
                            <span className="measurement-type">
                              {typeDisplay.icon} {typeDisplay.label}
                            </span>
                            <span className="measurement-value">
                              {measurement.scaled_dimension?.toFixed(3)} {typeDisplay.unit}
                            </span>
                            <span className="measurement-image">
                              📷 {measurement.image_filename}
                            </span>
                            <span className="measurement-date">
                              {new Date(measurement.created_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="selector-actions">
                    <button
                      onClick={() => setShowMeasurementSelector(false)}
                      className="confirm-selection-btn"
                      disabled={selectedMeasurements.length === 0}
                    >
                      Use Selected Measurements ({selectedMeasurements.length})
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="xcertainty-results">
        <h3>🔬 Analysis Results</h3>
        
        <div className="results-summary">
          <h4>Summary</h4>
          <p><strong>Whale ID:</strong> {results.whale_id}</p>
          <p><strong>Analysis Type:</strong> {results.analysis_type}</p>
          <p><strong>Convergence:</strong> {results.summary?.convergence || 'Unknown'}</p>
          {results.summary?.mean_length && (
            <p><strong>Mean Length:</strong> {results.summary.mean_length.toFixed(2)} m</p>
          )}
          {results.summary?.uncertainty_range && (
            <p><strong>Uncertainty Range:</strong> ±{results.summary.uncertainty_range.toFixed(2)} m</p>
          )}
        </div>

        {results.measurements && (
          <div className="measurements-uncertainty">
            <h4>Measurement Uncertainties</h4>
            <div className="uncertainty-table">
              <table>
                <thead>
                  <tr>
                    <th>Measurement</th>
                    <th>Posterior Mean</th>
                    <th>Std Dev</th>
                    <th>95% Credible Interval</th>
                  </tr>
                </thead>
                <tbody>
                  {results.measurements.map((measurement, index) => (
                    <tr key={index}>
                      <td>{measurement.measurement_type}</td>
                      <td>{measurement.posterior_mean.toFixed(3)} m</td>
                      <td>±{measurement.posterior_std.toFixed(3)} m</td>
                      <td>[{measurement.credible_interval[0].toFixed(3)}, {measurement.credible_interval[1].toFixed(3)}]</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="download-results">
          <button 
            onClick={() => downloadResults(results)}
            className="download-btn"
          >
            📥 Download Results
          </button>
        </div>
      </div>
    );
  };

  const downloadResults = (results) => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xcertainty_${results.whale_id}_${results.analysis_type}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

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

  return (
    <div className="xcertainty-tab">
      <h2>🔬 Xcertainty - Bayesian Uncertainty Analysis</h2>
      
      <div className="xcertainty-content">
        {/* Measurement Selection Section */}
        <div className="measurement-selection-section">
          <h3>Data Selection</h3>
          
          <div className="current-selection">
            <p><strong>Selected Whale:</strong> {selectedWhaleId || 'None'}</p>
            <p><strong>Selected Measurements:</strong> {selectedMeasurements.length}</p>
            
            <button
              onClick={() => setShowMeasurementSelector(true)}
              className="select-measurements-btn"
            >
              📊 Select Measurements to Analyze
            </button>
          </div>

          {selectedWhaleId && selectedMeasurements.length > 0 && (
            <div className="selected-measurements-preview">
              <h4>Selected Measurements Preview:</h4>
              <div className="measurements-preview-list">
                {availableMeasurements
                  .filter(m => selectedMeasurements.includes(m.id))
                  .slice(0, 3)
                  .map(measurement => {
                    const typeDisplay = getMeasurementTypeDisplay(measurement);
                    return (
                      <span key={measurement.id} className="measurement-tag">
                        {typeDisplay.icon} {typeDisplay.label}: {measurement.scaled_dimension?.toFixed(2)} {typeDisplay.unit}
                      </span>
                    );
                  })}
                {selectedMeasurements.length > 3 && (
                  <span className="more-measurements">
                    +{selectedMeasurements.length - 3} more...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Analysis Configuration */}
        <div className="analysis-config">
          <h3>Analysis Configuration</h3>
          
          <div className="analysis-type-selection">
            <label>
              <strong>Analysis Type:</strong>
              <select 
                value={analysisType} 
                onChange={(e) => setAnalysisType(e.target.value)}
                disabled={loading}
              >
                <option value="independent_length">Independent Length</option>
                <option value="nondecreasing_length">Non-decreasing Length</option>
                <option value="growth_curve">Growth Curve</option>
                <option value="calibration">Calibration</option>
              </select>
            </label>
          </div>

          <div className="analysis-parameters">
            <h4>MCMC Parameters</h4>
            <div className="parameter-grid">
              <label>
                Iterations:
                <input 
                  type="number" 
                  value={parameters.niter} 
                  onChange={(e) => setParameters({...parameters, niter: parseInt(e.target.value)})}
                  disabled={loading}
                  min="100"
                  max="10000"
                />
              </label>
              
              <label>
                Thinning:
                <input 
                  type="number" 
                  value={parameters.thin} 
                  onChange={(e) => setParameters({...parameters, thin: parseInt(e.target.value)})}
                  disabled={loading}
                  min="1"
                  max="10"
                />
              </label>
              
              <label>
                Burn-in (fraction):
                <input 
                  type="number" 
                  step="0.1"
                  value={parameters.summary_burn} 
                  onChange={(e) => setParameters({...parameters, summary_burn: parseFloat(e.target.value)})}
                  disabled={loading}
                  min="0.1"
                  max="0.9"
                />
              </label>
            </div>
          </div>

          <div className="analysis-description">
            <h4>Analysis Type Description</h4>
            <p>
              {analysisType === 'independent_length' && 
                "Treats each measurement independently with no constraints between measurements."}
              {analysisType === 'nondecreasing_length' && 
                "Enforces that length measurements cannot decrease over time for the same whale."}
              {analysisType === 'growth_curve' && 
                "Models whale growth using a von Bertalanffy growth curve with age information."}
              {analysisType === 'calibration' && 
                "Calibrates measurement error using known length measurements."}
            </p>
          </div>

          <button 
            onClick={runAnalysis}
            disabled={loading || !selectedWhaleId || selectedMeasurements.length === 0}
            className="run-analysis-btn"
          >
            {loading ? '🔄 Running Analysis...' : '▶️ Run Analysis'}
          </button>

          {error && (
            <div className="error-message" role="alert">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Existing Analyses */}
        <div className="existing-analyses">
          <h3>Previous Analyses</h3>
          {existingAnalyses.length > 0 ? (
            <div className="analyses-list">
              {existingAnalyses.map((analysis) => (
                <div key={analysis.id} className="analysis-item">
                  <div className="analysis-info">
                    <strong>{analysis.whale_id}</strong> - {analysis.analysis_type}
                    <br />
                    <small>{new Date(analysis.created_date).toLocaleDateString()}</small>
                    <br />
                    <small>{analysis.n_measurements} measurements</small>
                  </div>
                  <button 
                    onClick={() => loadExistingAnalysis(analysis.id)}
                    className="load-analysis-btn"
                  >
                    📊 View
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>No previous analyses found.</p>
          )}
        </div>

        {/* Results */}
        {renderResults()}
      </div>

      {/* Measurement Selector Modal */}
      {renderMeasurementSelector()}
    </div>
  );
};

export default XcertaintyTab;