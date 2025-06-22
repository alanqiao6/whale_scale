// XcertaintyTab.js - FIXED VERSION with proper error handling and data flow 

import React, { useState, useEffect } from 'react';
import './XcertaintyTab.css';

const XcertaintyTab = ({ currentWhaleId, formData }) => {
  const [analysisType, setAnalysisType] = useState('independent_length');
  const [parameters, setParameters] = useState({
    niter: 1000,  // Reduced for faster testing
    thin: 1,
    summary_burn: 0.5
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingAnalyses, setExistingAnalyses] = useState([]);
  const [showSamples, setShowSamples] = useState(false); // NEW: Toggle for sample arrays
  
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

  useEffect(() => {
    if (currentWhaleId && !selectedWhaleId) {
      setSelectedWhaleId(currentWhaleId);
      setTimeout(() => {
        loadMeasurementsForWhale(currentWhaleId);
      }, 100);
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

  const loadMeasurementsForWhale = async (whaleId) => {
    if (!whaleId) return;
    
    setLoadingMeasurements(true);
    setAvailableMeasurements([]);
    setError('');
    
    try {
      const response = await fetch("/api/collatrix/get_user_images/", {
        method: "GET",
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status}`);
      }
      
      const data = await response.json();
      const imagesToUse = data.images || [];
      
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

  // FIXED: Prepare data for Xcertainty analysis with proper structure
  // Add this debug code right before your parse request in XcertaintyTab.js
  // Replace the prepareObservationData function with this version:

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
      // Create a timepoint for each measurement
      const timepoint = index + 1;
      
      // Extract measurement value - handle different measurement types
      let measurementValue = measurement.scaled_dimension;
      if (!measurementValue || measurementValue <= 0) {
        console.warn(`Invalid measurement value for measurement ${measurement.id}: ${measurementValue}`);
        return; // Skip invalid measurements
      }

      // DEBUG: Log the raw measurement data
      console.log('Raw measurement data:', {
        id: measurement.id,
        scaled_dimension: measurement.scaled_dimension,
        type: typeof measurement.scaled_dimension,
        measurement_type: measurement.measurement_type
      });

      // Handle different measurement types
      let measurementType = 'TL'; // Default to Total Length
      if (measurement.measurement_type === 'ruler_complete' || 
          measurement.measurement_type === 'ruler' || 
          measurement.measurement_type === 'TL') {
        measurementType = 'TL';
      } else if (measurement.measurement_type === 'curve_length') {
        measurementType = 'CurveLength';
      }
      
      // CRITICAL FIX: Ensure all numeric values are proper numbers
      const observation = {
        Subject: String(selectedWhaleId), // Ensure string
        Timepoint: Number(timepoint),     // Ensure number
        Image: String(measurement.image_filename), // Ensure string
        [measurementType]: Number(measurementValue), // Ensure number
        // Required fields with default values - ALL AS NUMBERS
        FocalLength: Number(50.0),  // mm
        ImageWidth: Number(4000),   // pixels  
        SensorWidth: Number(23.5),  // mm
        UAS: String('DJI'),         // string
        Barometer: Number(25.0),    // Add default altitude as number
        Laser: null                 // null is ok
      };
      
      // DEBUG: Log the final observation
      console.log('Final observation:', observation);
      console.log('Observation data types:', {
        Subject: typeof observation.Subject,
        Timepoint: typeof observation.Timepoint,
        Image: typeof observation.Image,
        [measurementType]: typeof observation[measurementType],
        FocalLength: typeof observation.FocalLength,
        ImageWidth: typeof observation.ImageWidth,
        SensorWidth: typeof observation.SensorWidth,
        UAS: typeof observation.UAS,
        Barometer: typeof observation.Barometer,
        Laser: typeof observation.Laser
      });
      
      observations.push(observation);
    });

    if (observations.length === 0) {
      throw new Error('No valid observations could be created from selected measurements');
    }

    console.log('ALL prepared observations with types:', observations);
    
    // Additional validation - check that all numeric columns are actually numbers
    observations.forEach((obs, i) => {
      Object.keys(obs).forEach(key => {
        if (['FocalLength', 'ImageWidth', 'SensorWidth', 'Barometer', 'Timepoint', 'TL', 'CurveLength'].includes(key)) {
          if (obs[key] !== null && (typeof obs[key] !== 'number' || isNaN(obs[key]))) {
            console.error(`Invalid numeric value in observation ${i}, key ${key}:`, obs[key], typeof obs[key]);
          }
        }
      });
    });
    
    return observations;
  };

  // FIXED: Run analysis with proper error handling and data validation
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
        meas_col: ['TL'],// Primary measurement column
        image_col: 'Image',
        barometer_col: 'Barometer',
        laser_col: 'Laser',
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

      // CRITICAL FIX: Handle NaN values in response
      const responseText = await parseResponse.text();
      console.log('Raw response text:', responseText);
      
      // Replace NaN values with null before parsing JSON
      const cleanedResponseText = responseText.replace(/:\s*NaN/g, ': null');
      console.log('Cleaned response text:', cleanedResponseText);
      
      let parsedData;
      try {
        parsedData = JSON.parse(cleanedResponseText);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        console.error('Problematic response:', responseText.substring(0, 500));
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('Parsed data:', parsedData);

      // Step 3: Prepare priors
      const priors = {
        // Simple priors for demonstration
        altimeter_bias: {
          'Barometer': { mean: 0.0, sd: 1.0 },
          'Laser': { mean: 0.0, sd: 1.0 }
        },
        altimeter_scaling: {
          'Barometer': { mean: 1.0, sd: 0.1 },
          'Laser': { mean: 1.0, sd: 0.1 }
        },
        altimeter_variance: {
          'Barometer': { shape: 2.0, rate: 1.0 },
          'Laser': { shape: 2.0, rate: 1.0 }
        },
        image_altitude: [10.0, 100.0],
        pixel_variance: [2.0, 1.0],
        object_lengths: observations.map(() => [5.0, 25.0]) // Range for each measurement
      };

      // Step 4: Run the analysis
      const analysisPayload = {
        parsed_data: parsedData,
        priors: priors,
        include_samples: showSamples, // NEW: Include the toggle state
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
        // Handle NaN in analysis response too
        const analysisResponseText = await analysisResponse.text();
        const cleanedAnalysisText = analysisResponseText.replace(/:\s*NaN/g, ': null');
        
        let result;
        try {
          result = JSON.parse(cleanedAnalysisText);
        } catch (jsonError) {
          console.error('Analysis JSON parse error:', jsonError);
          throw new Error('Invalid JSON response from analysis endpoint');
        }
        
        console.log('Analysis result:', result);
        setResults(result);
        fetchExistingAnalyses(); // Refresh the list
        setError(''); // Clear any previous errors
      } else {
        const errorResponseText = await analysisResponse.text();
        const cleanedErrorText = errorResponseText.replace(/:\s*NaN/g, ': null');
        
        let errorData;
        try {
          errorData = JSON.parse(cleanedErrorText);
        } catch (jsonError) {
          throw new Error(`Analysis failed with status ${analysisResponse.status}`);
        }
        
        throw new Error(errorData.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to run analysis: ' + err.message);
    } finally {
      setLoading(false);
    }
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

  // Rest of your component remains the same...
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

  // ... [Rest of your render methods stay the same] ...

  return (
    <div className="xcertainty-tab">
      <h2>🔬 Xcertainty - Bayesian Uncertainty Analysis</h2>
      
      <div className="xcertainty-content">
        {/* Current selection display */}
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
                  max="5000"
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

          {/* NEW: Sample toggle */}
          <div className="sample-toggle">
            <label>
              <input 
                type="checkbox" 
                checked={showSamples}
                onChange={(e) => setShowSamples(e.target.checked)}
                disabled={loading}
              />
              Include raw sample arrays (warning: large output)
            </label>
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

        {/* Results display */}
        {results && (
          <div className="xcertainty-results">
            <h3>🔬 Analysis Results</h3>
            
            <div className="results-summary">
              <h4>Summary</h4>
              <p><strong>Analysis Type:</strong> {analysisType}</p>
              <p><strong>Whale ID:</strong> {selectedWhaleId}</p>
              <p><strong>Number of Measurements:</strong> {selectedMeasurements.length}</p>
              
              {/* Display basic results structure */}
              <div className="results-content">
                <pre style={{background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px', overflow: 'auto', maxHeight: '400px'}}>
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            </div>

            <div className="download-results">
              <button 
                onClick={() => downloadResults(results)}
                className="download-btn"
              >
                📥 Download Results
              </button>
            </div>
          </div>
        )}

        {/* Measurement Selector Modal */}
        {showMeasurementSelector && (
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
        )}
      </div>
    </div>
  );

  function downloadResults(results) {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xcertainty_${selectedWhaleId}_${analysisType}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
};

export default XcertaintyTab;