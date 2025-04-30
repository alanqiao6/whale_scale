'''
The following is a Python file adapted from the following extract_summaries.R file in the MMI-CODEX
https://github.com/MMI-CODEX/Xcertainty/blob/main/R/extract_summaries.R

Author: Jason Fitzpatrick
'''

import pandas as pd

def extract_summaries(model_output):
    """Recursive function to combine summary objects from other formatting functions.
    
    Args:
        model_output (dict): Collection of MCMC output formatted using functions such as
                            format_altimeter_output, format_image_output, etc.
    
    Returns:
        pd.DataFrame: Combined summary dataframe.
    """
    summaries = []
    for component in model_output.values():
        if isinstance(component, dict) and 'summary' in component:
            summaries.append(component['summary'])
        else:
            summaries.append(extract_summaries(component))
    
    return pd.concat(summaries, ignore_index=True) if summaries else pd.DataFrame()
