import numpy as np
import pandas as pd
from scipy.stats import mstats

def hpd_interval(samples, alpha=0.05):
    """Compute the highest posterior density (HPD) interval for given samples."""
    return mstats.mquantiles(samples, prob=[alpha / 2, 1 - alpha / 2])

def format_growth_curve_output(pkg, samples, post_inds):
    """Extract, summarize, and format growth curve components of model output.
    
    Args:
        pkg (dict): Analysis package containing metadata.
        samples (np.ndarray): Matrix of posterior samples.
        post_inds (array-like): Indices from samples to use for summarizing posterior distributions.
    
    Returns:
        dict: Formatted results containing metadata, samples, and summaries.
    """
    res = {
        'zero_length_age': {'samples': samples[post_inds, ['zero_length_age']]},
        'growth_rate': {'samples': samples[post_inds, ['growth_rate']]},
        'group_asymptotic_size': {
            'samples': samples[post_inds, [f'group_asymptotic_size[{i}]' for i in range(1, pkg['constants']['n_groups']+1)]]
        },
        'group_asymptotic_size_trend': {
            'samples': samples[post_inds, [f'group_asymptotic_size_trend[{i}]' for i in range(1, pkg['constants']['n_groups']+1)]]
        },
        'birth_year': {
            'samples': samples[post_inds, [f'subject_birth_year[{i}]' for i in range(1, pkg['constants']['n_growth_curve_subjects']+1)]]
        },
        'group_membership': {
            'samples': np.column_stack([
                np.eye(len(pkg['maps']['growth_curve']['groups']))[
                    samples[post_inds, f'subject_group[{i}]'].astype(int) - 1
                ] for i in range(len(pkg['maps']['growth_curve']['subjects']))
            ])
        },
        'asymptotic_size_sd': {'samples': samples[post_inds, ['asymptotic_size_sd']]},
        'group_size_shift_start_year': {'samples': samples[post_inds, ['group_size_shift_start_year']]},
        'subject_asymptotic_size': {
            'samples': samples[post_inds, [f'subject_asymptotic_size[{i}]' for i in range(1, pkg['constants']['n_growth_curve_subjects']+1)]]
        }
    }
    
    # Assign column names to structured sample outputs
    res['group_asymptotic_size']['samples'].columns = pkg['maps']['growth_curve']['groups']
    res['group_asymptotic_size_trend']['samples'].columns = pkg['maps']['growth_curve']['groups']
    res['birth_year']['samples'].columns = pkg['maps']['growth_curve']['subjects']
    res['subject_asymptotic_size']['samples'].columns = pkg['maps']['growth_curve']['subjects']
    
    # Summarize each component
    for component in res:
        m = res[component]['samples']
        res[component]['summary'] = pd.DataFrame({
            'parameter': [f"{col} {component}" for col in m.columns],
            'mean': m.mean(axis=0),
            'sd': m.std(axis=0),
            'HPD_low': [hpd_interval(m[col])[0] for col in m.columns],
            'HPD_high': [hpd_interval(m[col])[1] for col in m.columns],
            'ESS': [len(post_inds)],  # Effective Sample Size placeholder
            'PSS': [len(post_inds)]  # Posterior Sample Size
        })
    
    return res
