'''
The following is a Python file adapted from the following format_altimiter_output.R file in the MMI-CODEX
https://github.com/MMI-CODEX/Xcertainty/blob/main/R/breakFun.R

Author: Jason Fitzpatrick
'''

import pandas as pd
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
    
    for idx, row in pkg['maps']['altimeters'].reset_index().iterrows():
        meta = row.to_frame().T.reset_index(drop=True)
        model_index = str(idx + 1)  # Adjust indexing for Python
        
        # Identify relevant posterior samples
        tgt = [
            f'altimeter_bias[{model_index}]',
            f'altimeter_variance[{model_index}]',
            f'altimeter_scaling[{model_index}]'
        ]
        
        summary_samples = samples[post_inds][:, [tgt.index(param) for param in tgt]]
        
        # Compute posterior summaries
        summary = pd.DataFrame({
            'UAS': meta['UAS'].values[0],
            'altimeter': meta['altimeter'].values[0],
            'parameter': ['bias', 'variance', 'scaling'],
            'mean': summary_samples.mean(axis=0),
            'sd': summary_samples.std(axis=0),
            'HPD_low': [hpd_interval(summary_samples[:, i])[0] for i in range(summary_samples.shape[1])],
            'HPD_high': [hpd_interval(summary_samples[:, i])[1] for i in range(summary_samples.shape[1])],
            'ESS': [len(post_inds)],  # Effective Sample Size placeholder
            'PSS': [len(post_inds)]  # Posterior Sample Size
        })
        
        results[f"{meta['UAS'].values[0]} {meta['altimeter'].values[0]}"] = {
            'meta': meta,
            'samples': samples[:, [tgt.index(param) for param in tgt]],
            'summary': summary
        }
    
    return results
