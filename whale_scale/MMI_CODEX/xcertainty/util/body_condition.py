'''
The following is a Python file adapted from the following body_condition.R file in the MMI-CODEX
https://github.com/MMI-CODEX/Xcertainty/blob/main/R/body_condition.R
'''

import numpy as np
import pandas as pd
from scipy.stats import mstats

def hpd_interval(samples, alpha=0.05):
    """Compute the highest posterior density (HPD) interval for a given sample."""
    return mstats.mquantiles(samples, prob=[alpha / 2, 1 - alpha / 2])

def body_condition(data, output, length_name, width_names, width_increments, 
                    summary_burn=0.5, height_ratios=None, 
                    metric=['surface_area', 'body_area_index', 'body_volume', 'standardized_widths']):
    
    if 'body_area_index' in metric:
        metric = list(set(metric + ['surface_area']))
    
    if 'body_area_index' in metric and len(width_names) < 3:
        raise ValueError("Need at least 3 width measurements to compute body_area_index")
    
    if height_ratios is None:
        height_ratios = np.ones(len(width_names))
    
    # Prepare width metadata
    width_meta = pd.DataFrame({
        'measurement': width_names,
        'increment_proportion': np.array(width_increments) / 100
    }).sort_values(by='increment_proportion')
    
    required_measurements = [length_name] + list(width_meta['measurement'])
    
    subject_timepoints = data['prediction_objects'][['Subject', 'Timepoint']].drop_duplicates()
    
    body_condition_samples = {}
    
    for _, row in subject_timepoints.iterrows():
        subject, timepoint = row['Subject'], row['Timepoint']
        
        available_measurements = set(data['prediction_objects'].loc[
            (data['prediction_objects']['Subject'] == subject) &
            (data['prediction_objects']['Timepoint'] == timepoint), 'Measurement'
        ])
        
        if not all(m in available_measurements for m in required_measurements):
            continue
        
        total_length_samples = output['objects'][f"{subject} {length_name} {timepoint}"]['samples']
        
        width_samples = np.column_stack([
            output['objects'][f"{subject} {w} {timepoint}"]['samples'] for w in width_meta['measurement']
        ])
        
        height_samples = width_samples * height_ratios
        
        post_inds = slice(int(len(total_length_samples) * summary_burn), len(total_length_samples))
        
        res = {}
        
        if 'surface_area' in metric:
            nwidths = len(width_meta)
            res['surface_area'] = {}
            res['surface_area']['samples'] = (
                total_length_samples * np.sum(
                    np.diff(width_meta['increment_proportion']) * 
                    (width_samples[:, 1:nwidths] + width_samples[:, :nwidths-1]), axis=1
                ) / 2
            )
        
        if 'body_area_index' in metric:
            head_tail_range = np.ptp(width_meta['increment_proportion'])
            res['body_area_index'] = {}
            res['body_area_index']['samples'] = res['surface_area']['samples'] / (
                (head_tail_range * total_length_samples) ** 2) * 100
        
        if 'standardized_widths' in metric:
            res['standardized_widths'] = {
                w: {'samples': width_samples[:, i] / total_length_samples}
                for i, w in enumerate(width_names)
            }
        
        if 'body_volume' in metric:
            nwidths = len(width_meta)
            dwp = np.diff(width_meta['increment_proportion'])
            dw = width_samples[:, 1:nwidths] - width_samples[:, :nwidths-1]
            dh = height_samples[:, 1:nwidths] - height_samples[:, :nwidths-1]
            res['body_volume'] = {}
            res['body_volume']['samples'] = (
                np.pi * total_length_samples * np.sum(
                    dwp * (
                        dw * dh / 3 + 
                        (width_samples[:, :nwidths-1] * dh + height_samples[:, :nwidths-1] * dw) / 2 +
                        width_samples[:, :nwidths-1] * height_samples[:, :nwidths-1]
                    ), axis=1
                ) / 4
            )
        
        for m in res:
            if 'samples' in res[m]:
                res[m]['summary'] = {
                    'Subject': subject,
                    'Timepoint': timepoint,
                    'metric': m,
                    'mean': np.mean(res[m]['samples'][post_inds]),
                    'sd': np.std(res[m]['samples'][post_inds]),
                    'HPD': hpd_interval(res[m]['samples'][post_inds])
                }
            else:
                for s in res[m]:
                    res[m][s]['summary'] = {
                        'Subject': subject,
                        'Timepoint': timepoint,
                        'metric': f"{m} {s}",
                        'mean': np.mean(res[m][s]['samples'][post_inds]),
                        'sd': np.std(res[m][s]['samples'][post_inds]),
                        'HPD': hpd_interval(res[m][s]['samples'][post_inds])
                    }
        
        body_condition_samples[f"{subject} {timepoint}"] = res
    
    final_results = {m: {k: v[m] for k, v in body_condition_samples.items()} for m in metric}
    final_results['summaries'] = pd.DataFrame([
        entry for sample in body_condition_samples.values() for entry in sample.values()
    ])
    
    return final_results
