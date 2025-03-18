'''
The following is a Python file adapted from the following calibration_sampler.R file in the MMI-CODEX
https://github.com/MMI-CODEX/Xcertainty/blob/main/R/calibration_sampler.R
'''

import pymc as pm
import numpy as np
from ..util.data_validation import validate_training_objects
from ..formatters.format_altimeter_output import format_altimeter_output
from ..formatters.format_image_output import format_image_output
from ..formatters.format_pixel_output import format_pixel_output
from ..models.template_model import template_model
from ..util.extract_summaries import extract_summaries
from ..util.flatten_data import flatten_data

def calibration_sampler(data, priors, package_only=False):
    """MCMC sampler for calibration data.
    
    Args:
        data (dict): Photogrammetric data formatted for models.
        priors (dict): Dictionary defining the model's prior distribution.
        package_only (bool): If True, return formatted data used to build the sampler.
    
    Returns:
        function: Sampler function with arguments (niter, thin, summary_burn, verbose).
    """
    validate_training_objects(data['training_objects'])
    
    # Exclude prediction objects from model
    data['prediction_objects'] = None
    
    # Initialize analysis package
    pkg = flatten_data(data=data, priors=priors)
    
    if package_only:
        return pkg
    
    with pm.Model() as mod:
        # Define model components using template_model
        template_model(pkg['constants'], pkg['data'], pkg['inits'])
        
        # Configure MCMC
        trace = pm.sample(draws=2000, tune=1000, chains=4, return_inferencedata=True)
    
    def run_sampler(niter, thin=1, summary_burn=0.5, verbose=True):
        """Run the MCMC sampler."""
        if verbose:
            print("Sampling")
        
        with mod:
            samples = pm.sample(draws=niter, tune=int(niter * summary_burn), chains=4, return_inferencedata=True)
        
        post_inds = np.arange(int(niter * summary_burn), niter)
        res = {}
        
        if verbose:
            print("Extracting altimeter output")
        res['altimeters'] = format_altimeter_output(pkg, samples, post_inds)
        
        if verbose:
            print("Extracting image output")
        res['images'] = format_image_output(pkg, samples, post_inds)
        
        if verbose:
            print("Extracting pixel error output")
        res['pixel_error'] = format_pixel_output(pkg, samples, post_inds)
        
        if verbose:
            print("Extracting summaries")
        res['summaries'] = extract_summaries(res)
        
        return res
    
    return run_sampler
