'''
The following is a Python file adapted from the following format_pixel_output.R file in the MMI-CODEX
https://github.com/MMI-CODEX/Xcertainty/blob/main/R/format_pixel_output.R

Author: Jason Fitzpatrick
'''

import pandas as pd
from scipy.stats import mstats

def hpd_interval(samples, alpha=0.05):
    """Compute the highest posterior density (HPD) interval for given samples."""
    return mstats.mquantiles(samples, prob=[alpha / 2, 1 - alpha / 2])

def format_pixel_output(pkg, samples, post_inds):
    """Extract, summarize, and format pixel error components of model output.
    
    Args:
        pkg (dict): Analysis package containing metadata.
        samples (np.ndarray): Matrix of posterior samples.
        post_inds (array-like): Indices from samples to use for summarizing posterior distributions.
    
    Returns:
        dict: Formatted results containing samples and summary statistics.
    """
    tgt_param = 'pixel_variance'

    # Find the column index for this parameter
    if 'param_names' in pkg and tgt_param in pkg['param_names']:
        tgt_idx = pkg['param_names'].index(tgt_param)
    elif hasattr(pkg, 'param_names') and tgt_param in pkg.param_names:
        tgt_idx = list(pkg.param_names).index(tgt_param)
    else:
        # Fallback: assume pixel_variance is at index 0 or last column
        tgt_idx = 0  # or samples.shape[1] - 1
        print(f"Warning: Could not find parameter '{tgt_param}' in param_names, using index {tgt_idx}")

    summary_samples = samples[post_inds][:, tgt_idx]
    
    summary = pd.DataFrame({
        'error': ['pixel'],
        'parameter': ['variance'],
        'mean': [summary_samples.mean()],
        'sd': [summary_samples.std()],
        'HPD_low': [hpd_interval(summary_samples)[0]],
        'HPD_high': [hpd_interval(summary_samples)[1]],
        'ESS': [len(post_inds)],
        'PSS': [len(post_inds)]
    })
    
    return {
        'samples': samples[:, [tgt_idx]],  # Use integer index instead of string
        'summary': summary
    }
