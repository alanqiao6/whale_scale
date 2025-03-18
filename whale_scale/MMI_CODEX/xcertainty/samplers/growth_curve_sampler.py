'''
The following is a Python file adapted from the following growth_curve_sampler.R file in the MMI-CODEX
https://github.com/MMI-CODEX/Xcertainty/blob/main/R/growth_curve_sampler.R
'''

import numpy as np
import pandas as pd
from ..formatters.format_altimeter_output import format_altimeter_output
from ..formatters.format_growth_curve_output import format_growth_curve_output
from ..formatters.format_image_output import format_image_output
from ..formatters.format_object_output import format_object_output
from ..formatters.format_pixel_output import format_pixel_output
from ..util.data_validation import validate_prediction_objects, validate_training_objects
from ..util.extract_summaries import extract_summaries
from ..util.flatten_data import flatten_data

def growth_curve_sampler(data, priors, subject_info, package_only=False):
    """MCMC sampler for individual measurements with replicates and age information.
    
    Args:
        data (dict): Photogrammetric data formatted for models.
        priors (dict): Dictionary defining the model's prior distribution.
        subject_info (pd.DataFrame): Subject details including Year, Subject, Group, ObservedAge, and AgeType.
        package_only (bool): If True, return formatted data used to build the sampler.
    
    Returns:
        function: Sampler function with arguments (niter, thin, summary_burn, verbose).
    """
    validate_training_objects(data['training_objects'])
    validate_prediction_objects(data['prediction_objects'])
    
    # Ensure subjects have only one group definition
    ambiguous_subjects = subject_info.groupby('Subject')['Group'].nunique()
    if (ambiguous_subjects > 1).any():
        raise ValueError("Subjects in 'subject_info' must have one group definition.")
    
    pkg = flatten_data(data=data, priors=priors)
    pkg['maps']['growth_curve'] = {}
    
    pkg['maps']['growth_curve']['subjects'] = subject_info['Subject'].unique()
    pkg['constants']['n_growth_curve_subjects'] = len(pkg['maps']['growth_curve']['subjects'])
    pkg['constants']['prior_zero_length_age'] = priors['zero_length_age']
    pkg['inits']['zero_length_age'] = priors['zero_length_age']['mean']
    pkg['constants']['prior_growth_rate'] = priors['growth_rate']
    pkg['inits']['growth_rate'] = priors['growth_rate']['mean']
    
    # Identify groups and remove NaNs
    pkg['maps']['growth_curve']['groups'] = subject_info['Group'].dropna().unique()
    pkg['constants']['n_groups'] = len(pkg['maps']['growth_curve']['groups'])
    
    pkg['constants']['prior_group_asymptotic_size'] = priors['group_asymptotic_size'][pkg['maps']['growth_curve']['groups']]
    pkg['inits']['group_asymptotic_size'] = pkg['constants']['prior_group_asymptotic_size']['mean'].values
    
    pkg['constants']['prior_group_asymptotic_size_trend'] = priors['group_asymptotic_size_trend'][pkg['maps']['growth_curve']['groups']]
    pkg['inits']['group_asymptotic_size_trend'] = pkg['constants']['prior_group_asymptotic_size_trend']['mean'].values
    
    pkg['inits']['subject_group'] = subject_info[['Subject', 'Group']].merge(
        pd.DataFrame({'Group': pkg['maps']['growth_curve']['groups'], 'group_ind': range(1, len(pkg['maps']['growth_curve']['groups']) + 1)}),
        on='Group', how='left'
    )['group_ind'].fillna(0).astype(int).values
    
    pkg['constants']['subject_group_distribution'] = priors['subject_group_distribution'][pkg['maps']['growth_curve']['groups']]
    pkg['constants']['unknown_subject_group'] = np.where(pkg['inits']['subject_group'] == 0)[0]
    pkg['constants']['n_missing_subject_groups'] = len(pkg['constants']['unknown_subject_group'])
    
    if package_only:
        return pkg
    
    def run_sampler(niter, thin=1, summary_burn=0.5, verbose=True):
        """Run the MCMC sampler."""
        if verbose:
            print("Sampling")
        
        samples = np.random.randn(niter, len(pkg['inits']))  # Placeholder MCMC sampler
        post_inds = np.arange(int(niter * summary_burn), niter)
        
        res = {
            'altimeters': format_altimeter_output(pkg, samples, post_inds),
            'images': format_image_output(pkg, samples, post_inds),
            'pixel_error': format_pixel_output(pkg, samples, post_inds),
            'objects': format_object_output(pkg, samples, post_inds, data['prediction_objects']),
            'growth_curve': format_growth_curve_output(pkg, samples, post_inds),
            'summaries': extract_summaries({
                'altimeters': format_altimeter_output(pkg, samples, post_inds),
                'images': format_image_output(pkg, samples, post_inds),
                'pixel_error': format_pixel_output(pkg, samples, post_inds),
                'objects': format_object_output(pkg, samples, post_inds, data['prediction_objects']),
                'growth_curve': format_growth_curve_output(pkg, samples, post_inds),
            })
        }
        
        return res
    
    return run_sampler
