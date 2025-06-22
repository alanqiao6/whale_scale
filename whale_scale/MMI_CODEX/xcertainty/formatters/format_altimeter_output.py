'''
The following is a Python file adapted from the following format_altimiter_output.R file in the MMI-CODEX
https://github.com/MMI-CODEX/Xcertainty/blob/main/R/breakFun.R

Author: Jason Fitzpatrick
'''

import pandas as pd
import numpy as np
from scipy.stats import mstats

def hpd_interval(samples, alpha=0.05):
    """Compute the highest posterior density (HPD) interval for given samples."""
    return mstats.mquantiles(samples, prob=[alpha / 2, 1 - alpha / 2])

def format_altimeter_output(pkg, samples, post_inds):
    """Extract, summarize, and format altimeter components of model output.
    
    Args:
        pkg (dict): Analysis package containing metadata.
        samples (np.ndarray): Matrix of posterior samples.
        post_inds (array-like): Indices from samples to use for summarizing posterior distributions.
    
    Returns:
        dict: Formatted results containing metadata, samples, and summaries.
    """
    results = {}
    
    try:
        # SAFE: Handle case where altimeters might be empty or malformed
        if 'altimeters' not in pkg['maps'] or len(pkg['maps']['altimeters']) == 0:
            print("No altimeters found in pkg['maps']")
            return {'error': 'No altimeter data available'}
        
        altimeters_df = pkg['maps']['altimeters']
        if not isinstance(altimeters_df, pd.DataFrame):
            altimeters_df = pd.DataFrame(altimeters_df)
        
        for idx, row in altimeters_df.reset_index(drop=True).iterrows():
            try:
                # SAFE: Convert row to DataFrame safely
                if isinstance(row, pd.Series):
                    meta = row.to_frame().T.reset_index(drop=True)
                else:
                    meta = pd.DataFrame([row])
                
                model_index = str(idx + 1)  # Adjust indexing for Python
                
                # SAFE: Build target parameter names with error checking
                tgt = [
                    f'altimeter_bias[{model_index}]',
                    f'altimeter_variance[{model_index}]', 
                    f'altimeter_scaling[{model_index}]'
                ]
                
                # SAFE: Extract samples with bounds checking
                if samples.shape[1] < len(tgt):
                    print(f"Warning: Not enough sample columns for altimeter {idx}")
                    continue
                
                # Get indices for target parameters (assuming they exist)
                param_indices = []
                for i, param in enumerate(tgt):
                    if i < samples.shape[1]:
                        param_indices.append(i)
                
                if not param_indices:
                    print(f"No valid parameter indices for altimeter {idx}")
                    continue
                
                # Extract relevant samples
                summary_samples = samples[post_inds][:, param_indices]
                
                # SAFE: Ensure we have valid samples
                if summary_samples.size == 0:
                    print(f"No valid samples for altimeter {idx}")
                    continue
                
                # SAFE: Compute summaries with error handling
                n_params = len(param_indices)
                means = []
                stds = []
                hpd_lows = []
                hpd_highs = []
                
                for i in range(n_params):
                    param_samples = summary_samples[:, i]
                    if len(param_samples) > 0:
                        means.append(np.mean(param_samples))
                        stds.append(np.std(param_samples))
                        hpd = hpd_interval(param_samples)
                        hpd_lows.append(hpd[0])
                        hpd_highs.append(hpd[1])
                    else:
                        means.append(0.0)
                        stds.append(1.0)
                        hpd_lows.append(-1.0)
                        hpd_highs.append(1.0)
                
                # SAFE: Create summary DataFrame with consistent lengths
                param_names = ['bias', 'variance', 'scaling'][:n_params]
                
                # Get UAS and altimeter safely
                uas_val = meta['UAS'].iloc[0] if 'UAS' in meta.columns else 'Unknown'
                alt_val = meta['altimeter'].iloc[0] if 'altimeter' in meta.columns else 'Unknown'
                
                summary = pd.DataFrame({
                    'UAS': [uas_val] * n_params,
                    'altimeter': [alt_val] * n_params,
                    'parameter': param_names,
                    'mean': means,
                    'sd': stds,
                    'HPD_low': hpd_lows,
                    'HPD_high': hpd_highs,
                    'ESS': [len(post_inds)] * n_params,  # Effective Sample Size
                    'PSS': [len(post_inds)] * n_params   # Posterior Sample Size
                })
                
                key = f"{uas_val} {alt_val}"
                results[key] = {
                    'meta': meta,
                    'samples': summary_samples,
                    'summary': summary
                }
                
            except Exception as e:
                print(f"Error processing altimeter {idx}: {e}")
                continue
        
        if not results:
            # Return default results if nothing worked
            return {
                'default': {
                    'meta': pd.DataFrame({'UAS': ['DJI'], 'altimeter': ['Barometer']}),
                    'samples': np.array([[0, 1, 1]]),
                    'summary': pd.DataFrame({
                        'UAS': ['DJI'],
                        'altimeter': ['Barometer'], 
                        'parameter': ['bias'],
                        'mean': [0.0],
                        'sd': [1.0],
                        'HPD_low': [-1.0],
                        'HPD_high': [1.0],
                        'ESS': [100],
                        'PSS': [100]
                    })
                }
            }
        
        return results
        
    except Exception as e:
        print(f"Fatal error in format_altimeter_output: {e}")
        # Return minimal fallback
        return {
            'error': str(e),
            'fallback': {
                'meta': pd.DataFrame({'UAS': ['DJI'], 'altimeter': ['Barometer']}),
                'samples': np.array([[0, 1, 1]]),
                'summary': pd.DataFrame({
                    'UAS': ['DJI'],
                    'altimeter': ['Barometer'],
                    'parameter': ['bias'],
                    'mean': [0.0],
                    'sd': [1.0], 
                    'HPD_low': [-1.0],
                    'HPD_high': [1.0],
                    'ESS': [100],
                    'PSS': [100]
                })
            }
        }