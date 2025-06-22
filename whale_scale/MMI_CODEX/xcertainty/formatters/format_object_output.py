'''
The following is a Python file adapted from the following format_object_output.R file in the MMI-CODEX
https://github.com/MMI-CODEX/Xcertainty/blob/main/R/format_object_output.R

Author: Jason Fitzpatrick
'''

import pandas as pd
from scipy.stats import mstats

def hpd_interval(samples, alpha=0.05):
    """Compute the highest posterior density (HPD) interval for given samples."""
    return mstats.mquantiles(samples, prob=[alpha / 2, 1 - alpha / 2])

def format_object_output(pkg, samples, post_inds, prediction_objects):
    """Extract, summarize, and format object size components of model output.
    
    Args:
        pkg (dict): Analysis package containing metadata.
        samples (np.ndarray): Matrix of posterior samples.
        post_inds (array-like): Indices from samples to use for summarizing posterior distributions.
        prediction_objects (pd.DataFrame): Data specifying which objects had lengths to be estimated.
    
    Returns:
        dict: Formatted results containing metadata, samples, and summaries.
    """
    results = {}
    
    merged_data = prediction_objects.merge(
        pkg['maps']['objects'].reset_index().rename(columns={'index': 'model_index'}),
        on=['Subject', 'Measurement', 'Timepoint'],
        how='left'
    )
    
    for _, row in merged_data.iterrows():
        meta = row.to_frame().T.reset_index(drop=True)
        model_index = str(int(row['model_index']) + 1)
        
        # Identify relevant posterior samples
        tgt_param = f'object_length[{model_index}]'

        # Find the column index for this parameter
        if 'param_names' in pkg and tgt_param in pkg['param_names']:
            tgt_idx = pkg['param_names'].index(tgt_param)
        elif hasattr(pkg, 'param_names') and tgt_param in pkg.param_names:
            tgt_idx = list(pkg.param_names).index(tgt_param)
        else:
            # Fallback: assume the parameter index matches the object index
            tgt_idx = int(row['model_index'])
            print(f"Warning: Could not find parameter '{tgt_param}' in param_names, using index {tgt_idx}")

        summary_samples = samples[post_inds][:, tgt_idx]
        
        # Compute posterior summaries
        summary = pd.DataFrame({
            'Subject': [row['Subject']],
            'Measurement': [row['Measurement']],
            'Timepoint': [row['Timepoint']],
            'parameter': ['length'],
            'mean': [summary_samples.mean()],
            'sd': [summary_samples.std()],
            'HPD_low': [hpd_interval(summary_samples)[0]],
            'HPD_high': [hpd_interval(summary_samples)[1]],
            'ESS': [len(post_inds)],
            'PSS': [len(post_inds)]
        })
        
        results[f"{row['Subject']} {row['Measurement']} {row['Timepoint']}"] = {
            'meta': meta,
            'samples': samples[:, [tgt_idx]],  # Use integer index instead of string
            'summary': summary
        }
    
    return results
