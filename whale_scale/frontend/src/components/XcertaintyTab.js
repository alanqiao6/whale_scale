// XcertaintyTab.js - Add this as a new component

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

  useEffect(() => {
    fetchExistingAnalyses();
  }, [currentWhaleId]);

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
    if (!currentWhaleId) {
      setError('Please select a whale first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        whale_id: currentWhaleId,
        ...parameters
      };

      // Add subject info for growth curve analysis
      if (analysisType === 'growth_curve') {
        payload.subject_info = {
          Subject: currentWhaleId,
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
      const response = await fetch(`/api/xcertainty/details/${analysisId}/`, {
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
        {/* Current Whale Info */}
        <div className="whale-info">
          <h3>Current Whale</h3>
          {currentWhaleId ? (
            <div>
              <p><strong>ID:</strong> {currentWhaleId}</p>
              {formData?.whaleName && <p><strong>Name:</strong> {formData.whaleName}</p>}
            </div>
          ) : (
            <p>No whale selected. Please upload an image and set a whale name first.</p>
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
            disabled={loading || !currentWhaleId}
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
    </div>
  );
};

export default XcertaintyTab;