'''
The following is a Python file adapted from the following format_image_output.R file in the MMI-CODEX
https://github.com/MMI-CODEX/Xcertainty/blob/main/R/format_image_output.R

Author: Jason Fitzpatrick
'''

import pandas as pd
from scipy.stats import mstats

def hpd_interval(samples, alpha=0.05):
    """Compute the highest posterior density (HPD) interval for given samples."""
    return mstats.mquantiles(samples, prob=[alpha / 2, 1 - alpha / 2])

def format_image_output(pkg, samples, post_inds):
    """Extract, summarize, and format image components of model output.
    
    Args:
        pkg (dict): Analysis package containing metadata.
        samples (np.ndarray): Matrix of posterior samples.
        post_inds (array-like): Indices from samples to use for summarizing posterior distributions.
    
    Returns:
        dict: Formatted results containing metadata, samples, and summaries.
    """
    results = {}
    
    for idx, image in enumerate(pkg['maps']['images']):
        meta = pd.DataFrame({'Image': [image], 'model_index': [idx + 1]})
        model_index = str(idx + 1)  # Adjust indexing for Python
        
        # Identify relevant posterior samples
        tgt = f'image_altitude[{model_index}]'
        
        summary_samples = samples[post_inds][:, [tgt]]
        
        # Compute posterior summaries
        summary = pd.DataFrame({
            'Image': image,
            'parameter': 'altitude',
            'mean': summary_samples.mean(),
            'sd': summary_samples.std(),
            'HPD_low': hpd_interval(summary_samples)[0],
            'HPD_high': hpd_interval(summary_samples)[1],
            'ESS': len(post_inds),  # Effective Sample Size placeholder
            'PSS': len(post_inds)  # Posterior Sample Size
        })
        
        results[image] = {
            'meta': meta,
            'samples': samples[:, [tgt]],
            'summary': summary
        }
    
    return results
