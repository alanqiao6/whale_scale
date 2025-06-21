// XcertaintyTab.js - FINAL WORKING VERSION with infinite loop fix
// COPY AND PASTE THIS ENTIRE FILE to replace your existing XcertaintyTab.js

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
  
  // State for measurement selection
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

  // FIXED: Remove savedImages dependency to prevent infinite loop
  useEffect(() => {
    if (currentWhaleId && !selectedWhaleId) {
      setSelectedWhaleId(currentWhaleId);
      // Add small delay to ensure data is loaded
      setTimeout(() => {
        loadMeasurementsForWhale(currentWhaleId);
      }, 100);
    }
  }, [currentWhaleId]); // REMOVED savedImages from dependencies

  const fetchSavedImages = async () => {
    try {
      const response = await fetch("/api/collatrix/get_user_images/", {
        method: "GET",
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedImages(data.images || []);
        groupImagesByWhale(data.images || []);
      }
    } catch (err) {
      console.error('Error fetching saved images:', err);
    }
  };

  const groupImagesByWhale = (images) => {
    const groups = {};
    
    if (!Array.isArray(images)) return;
    
    images.forEach(image => {
      const whaleId = image.whale_id || `${image.whale_name || 'Unknown'}1`;
      const displayName = whaleId;
      
      if (!groups[whaleId]) {
        groups[whaleId] = {
          whale_name: image.whale_name || whaleId.replace(/\d+$/, ''),
          whale_id: whaleId,
          display_name: displayName,
          images: [],
          total_measurements: 0
        };
      }
      groups[whaleId].images.push(image);
      groups[whaleId].total_measurements += image.measurement_count || 0;
    });
    
    setWhaleGroups(groups);
  };

  // FIXED: Always fetch fresh data to avoid stale state issues
  const loadMeasurementsForWhale = async (whaleId) => {
    if (!whaleId) return;
    
    setLoadingMeasurements(true);
    setAvailableMeasurements([]);
    setError('');
    
    try {
      // Always fetch fresh images to avoid stale data
      const response = await fetch("/api/collatrix/get_user_images/", {
        method: "GET",
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status}`);
      }
      
      const data = await response.json();
      const imagesToUse = data.images || [];
      
      // Update savedImages if needed (but don't depend on it)
      if (savedImages.length === 0) {
        setSavedImages(imagesToUse);
        groupImagesByWhale(imagesToUse);
      }
      
      const whaleImages = imagesToUse.filter(img => 
        img.whale_id === whaleId || 
        (img.whale_name && img.whale_name === whaleId.replace(/\d+$/, ''))
      );
      
      if (whaleImages.length === 0) {
        console.log(`No images found for whale ${whaleId}`);
        setAvailableMeasurements([]);
        setSelectedMeasurements([]);
        return;
      }
      
      const allMeasurements = [];
      for (const image of whaleImages) {
        try {
          const measurementResponse = await fetch(`/api/collatrix/get_image_measurements/?image_id=${image.id}`, {
            method: "GET",
            credentials: 'include',
          });
          
          if (measurementResponse.ok) {
            const measurementData = await measurementResponse.json();
            const measurements = measurementData.measurements || [];
            
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
      
      console.log(`Found ${allMeasurements.length} measurements for whale ${whaleId}`);
      setAvailableMeasurements(allMeasurements);
      setSelectedMeasurements(allMeasurements.map(m => m.id));
      
    } catch (err) {
      console.error('Error loading measurements for whale:', err);
      setError('Failed to load measurements for selected whale: ' + err.message);
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

  // Prepare data for Xcertainty analysis
  const prepareObservationData = () => {
    if (!selectedWhaleId || selectedMeasurements.length === 0) {
      throw new Error('No whale or measurements selected');
    }

    // Get selected measurements
    const selectedMeasurementData = availableMeasurements.filter(m => 
      selectedMeasurements.includes(m.id)
    );

    if (selectedMeasurementData.length === 0) {
      throw new Error('No valid measurements found');
    }

    // Transform measurements into wide-format observations for Xcertainty
    const observations = [];
    
    selectedMeasurementData.forEach((measurement, index) => {
      // Create a timepoint for each measurement (can be sequential or based on date)
      const timepoint = index + 1;
      
      // Extract measurement value
      let measurementValue = measurement.scaled_dimension;
      let measurementType = 'TL'; // Default to Total Length
      
      // Handle different measurement types
      if (measurement.measurement_type === 'ruler_complete' || 
          measurement.measurement_type === 'ruler' || 
          measurement.measurement_type === 'TL') {
        measurementType = 'TL';
      } else if (measurement.measurement_type === 'curve_length') {
        measurementType = 'CurveLength';
      } else {
        measurementType = measurement.measurement_type;
      }
      
      // Create observation record
      const observation = {
        Subject: selectedWhaleId,
        Timepoint: timepoint,
        Image: measurement.image_filename,
        [measurementType]: measurementValue,
        // Add dummy values for required fields
        FocalLength: 50.0,  // mm
        ImageWidth: 4000,   // pixels
        SensorWidth: 23.5,  // mm
        UAS: 'DJI',
        Barometer: null,
        Laser: null
      };
      
      observations.push(observation);
    });

    return observations;
  };

  // Run analysis with proper data preparation
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
      // Step 1: Prepare observation data
      const observations = prepareObservationData();
      
      console.log('Prepared observations:', observations);

      // Step 2: Parse observations using the backend
      const parsePayload = {
        observations: observations,
        subject_col: 'Subject',
        meas_col: 'TL', // or primary measurement column
        image_col: 'Image',
        flen_col: 'FocalLength',
        iwidth_col: 'ImageWidth',
        swidth_col: 'SensorWidth',
        uas_col: 'UAS',
        timepoint_col: 'Timepoint'
      };

      console.log('Sending parse request:', parsePayload);

      const parseResponse = await fetch('/api/xcertainty/parse_observations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken') || '',
        },
        credentials: 'include',
        body: JSON.stringify(parsePayload)
      });

      if (!parseResponse.ok) {
        const parseError = await parseResponse.json();
        throw new Error(`Parse error: ${parseError.error || 'Failed to parse observations'}`);
      }

      const parsedData = await parseResponse.json();
      console.log('Parsed data:', parsedData);

      // Step 3: Prepare priors (using defaults for now)
      const priors = {
        // Default priors for independent length analysis
        length_mean_prior: [10.0, 5.0], // mean, std
        length_std_prior: [1.0, 0.5],   // mean, std
        measurement_error_prior: [0.1, 0.05] // mean, std
      };

      // Step 4: Run the analysis
      const analysisPayload = {
        parsed_data: parsedData,
        priors: priors,
        ...parameters
      };

      // Add subject info for growth curve analysis
      if (analysisType === 'growth_curve') {
        analysisPayload.subject_info = [{
          Subject: selectedWhaleId,
          Year: new Date().getFullYear(),
          Group: 'default',
          ObservedAge: 1,
          AgeType: 'estimated'
        }];
      }

      console.log('Sending analysis request:', analysisPayload);

      const analysisResponse = await fetch(`/api/xcertainty/${analysisType}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken') || '',
        },
        credentials: 'include',
        body: JSON.stringify(analysisPayload)
      });

      if (analysisResponse.ok) {
        const result = await analysisResponse.json();
        console.log('Analysis result:', result);
        setResults(result);
        fetchExistingAnalyses(); // Refresh the list
      } else {
        const errorData = await analysisResponse.json();
        throw new Error(errorData.error || 'Analysis failed');
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
                    🐋 {whale.display_name || whale.whale_id} ({whale.total_measurements} measurements)
                  </button>
                );
              })}
            </div>
          </div>

          {selectedWhaleId && (
            <div className="measurement-selection">
              <h4>Select Measurements for {whaleGroups[selectedWhaleId]?.display_name || whaleGroups[selectedWhaleId]?.whale_id}:</h4>
              
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
          <p><strong>Number of Measurements:</strong> {results.n_measurements}</p>
          <p><strong>Convergence:</strong> {results.convergence}</p>
          
          {results.summary && (
            <>
              <p><strong>Mean Length:</strong> {results.summary.posterior_mean?.toFixed(3)} m</p>
              <p><strong>Standard Deviation:</strong> {results.summary.posterior_std?.toFixed(3)} m</p>
              <p><strong>95% Credible Interval:</strong> [{results.summary.credible_interval_95?.[0]?.toFixed(3)}, {results.summary.credible_interval_95?.[1]?.toFixed(3)}] m</p>
              <p><strong>Uncertainty Range:</strong> ±{results.summary.uncertainty_range?.toFixed(3)} m</p>
            </>
          )}
        </div>

        {results.measurements && (
          <div className="measurements-uncertainty">
            <h4>Individual Measurement Uncertainties</h4>
            <div className="uncertainty-table">
              <table>
                <thead>
                  <tr>
                    <th>Measurement #</th>
                    <th>Original Value</th>
                    <th>Posterior Mean</th>
                    <th>Posterior Std</th>
                    <th>95% Credible Interval</th>
                  </tr>
                </thead>
                <tbody>
                  {results.measurements.map((measurement, index) => (
                    <tr key={index}>
                      <td>{measurement.measurement_id}</td>
                      <td>{measurement.original_value.toFixed(3)} m</td>
                      <td>{measurement.posterior_mean.toFixed(3)} m</td>
                      <td>±{measurement.posterior_std.toFixed(3)} m</td>
                      <td>[{measurement.credible_interval[0].toFixed(3)}, {measurement.credible_interval[1].toFixed(3)}] m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {results.diagnostics && (
          <div className="diagnostics-info">
            <h4>MCMC Diagnostics</h4>
            <p><strong>R-hat:</strong> {results.diagnostics.r_hat} (good if &lt; 1.1)</p>
            <p><strong>Effective Sample Size:</strong> {results.summary?.effective_sample_size}</p>
            <p><strong>Chains:</strong> {results.diagnostics.chains}</p>
            <p><strong>Iterations:</strong> {results.diagnostics.iterations}</p>
            <p><strong>Divergent Transitions:</strong> {results.diagnostics.n_divergent}</p>
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
    link.download = `xcertainty_${selectedWhaleId}_${analysisType}_${new Date().toISOString().slice(0, 10)}.json`;
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