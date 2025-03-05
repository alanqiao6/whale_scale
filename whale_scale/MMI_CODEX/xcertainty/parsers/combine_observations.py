import pandas as pd
from ..util.data_validation import validate_image_info, validate_pixel_counts, validate_prediction_objects, validate_training_objects

def combine_observations(*args):
    """Combine multiple parsed observation datasets into a single dataset.
    
    Args:
        *args: Variable number of parsed observation dictionaries.
    
    Returns:
        dict: Combined parsed observation dataset.
    """
    for i, obs in enumerate(args):
        if not isinstance(obs, dict) or not all(key in obs for key in ['pixel_counts', 'training_objects', 'prediction_objects', 'image_info']):
            raise ValueError(f"Argument {i+1} is not output from parse_observations().")
    
    res = {
        'pixel_counts': pd.concat([obs['pixel_counts'] for obs in args], ignore_index=True),
        'training_objects': pd.concat([obs['training_objects'] for obs in args], ignore_index=True) if any(obs['training_objects'] is not None for obs in args) else None,
        'prediction_objects': pd.concat([obs['prediction_objects'] for obs in args], ignore_index=True) if any(obs['prediction_objects'] is not None for obs in args) else None,
        'image_info': pd.concat([obs['image_info'] for obs in args], ignore_index=True)
    }
    
    # Validate combined data
    validate_pixel_counts(res['pixel_counts'])
    if res['training_objects'] is not None:
        validate_training_objects(res['training_objects'])
    if res['prediction_objects'] is not None:
        validate_prediction_objects(res['prediction_objects'])
    validate_image_info(res['image_info'])
    
    return res
