'''
The following is a Python file adapted from the following independent_length_sampler.R file in the MMI-CODEX
https://github.com/MMI-CODEX/Xcertainty/blob/main/R/independent_length_sampler.R

Author: Jason Fitzpatrick
'''

import numpy as np
from ..formatters.format_altimeter_output import format_altimeter_output
from ..formatters.format_image_output import format_image_output
from ..formatters.format_object_output import format_object_output
from ..formatters.format_pixel_output import format_pixel_output
from ..util.data_validation import validate_prediction_objects, validate_training_objects
from ..util.extract_summaries import extract_summaries
from ..util.flatten_data import flatten_data

def independent_length_sampler(data, priors, package_only=False):
    """MCMC sampler for independent length measurements.
    
    Args:
        data (dict): Photogrammetric data formatted for models.
        priors (dict): Dictionary defining the model's prior distribution.
        package_only (bool): If True, return formatted data used to build the sampler.
    
    Returns:
        function: Sampler function with arguments (niter, thin, summary_burn, verbose).
    """
    validate_training_objects(data['training_objects'])
    validate_prediction_objects(data['prediction_objects'])
    
    pkg = flatten_data(data=data, priors=priors)
    
    # Set length priors
    pkg['constants']['n_basic_objects'] = len(data['prediction_objects'])
    pkg['constants']['prior_basic_object'] = np.array(priors['object_lengths'])
    
    basic_object_ind = data['prediction_objects'].merge(
        pkg['maps']['objects'].reset_index().rename(columns={'index': 'ind'}),
        on=['Subject', 'Measurement', 'Timepoint'], how='left'
    )['ind'].astype(int).values
    
    pkg['constants']['basic_object_ind'] = basic_object_ind
    pkg['inits']['object_length'] = np.full(len(pkg['maps']['objects']), np.nan)
    pkg['inits']['object_length'][basic_object_ind] = np.random.uniform(
        low=pkg['constants']['prior_basic_object'][:, 0],
        high=pkg['constants']['prior_basic_object'][:, 1]
    )
    
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
            'summaries': extract_summaries({
                'altimeters': format_altimeter_output(pkg, samples, post_inds),
                'images': format_image_output(pkg, samples, post_inds),
                'pixel_error': format_pixel_output(pkg, samples, post_inds),
                'objects': format_object_output(pkg, samples, post_inds, data['prediction_objects']),
            })
        }
        
        return res
    
    return run_sampler
