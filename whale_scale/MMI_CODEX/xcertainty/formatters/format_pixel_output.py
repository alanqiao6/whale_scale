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
    tgt = 'pixel_variance'
    
    summary_samples = samples[post_inds][:, [tgt]]
    
    summary = pd.DataFrame({
        'error': 'pixel',
        'parameter': 'variance',
        'mean': summary_samples.mean(),
        'sd': summary_samples.std(),
        'HPD_low': hpd_interval(summary_samples)[0],
        'HPD_high': hpd_interval(summary_samples)[1],
        'ESS': len(post_inds),  # Effective Sample Size placeholder
        'PSS': len(post_inds)  # Posterior Sample Size
    })
    
    return {
        'samples': samples[:, [tgt]],
        'summary': summary
    }
