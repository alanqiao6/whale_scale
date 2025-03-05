import pandas as pd
import numpy as np
from .data_validation import validate_image_info, validate_pixel_counts, validate_prediction_objects, validate_training_objects

def flatten_data(data=None, priors=None, pixel_counts=None, 
                  training_objects=None, image_info=None, prediction_objects=None):
    """Reformat photogrammetric data for model-based analysis."""
    
    if priors is None:
        raise ValueError("Priors must be provided.")
    
    required_prior_components = [
        'altimeter_bias', 'altimeter_variance', 'image_altitude',
        'pixel_variance', 'altimeter_scaling'
    ]
    
    for component in required_prior_components:
        if component not in priors:
            raise ValueError(f"Missing component from input: priors['{component}']")
    
    validate_pixel_counts(pixel_counts)
    validate_image_info(image_info)
    
    if training_objects is not None:
        validate_training_objects(training_objects)
    if prediction_objects is not None:
        validate_prediction_objects(prediction_objects)
    
    # Enumerate altimeter combinations in data
    altimeter_types = (
        image_info[['UAS'] + list(priors['altimeter_bias'].keys())]
        .melt(id_vars=['UAS'], var_name='altimeter', value_name='measurement')
        .dropna()
        .drop_duplicates()
        .sort_values(by=['UAS', 'altimeter'])
    )
    
    # Combine training and prediction objects
    object_list = pd.concat(
        [training_objects[['Subject', 'Measurement', 'Timepoint']] if training_objects is not None else None,
         prediction_objects[['Subject', 'Measurement', 'Timepoint']] if prediction_objects is not None else None],
        ignore_index=True
    ).dropna()
    
    # Merge pixel count data
    pixel_counts = object_list.merge(pixel_counts, on=['Subject', 'Measurement', 'Timepoint'], how='left')
    pixel_counts.sort_values(by='Image', inplace=True)
    
    # Initialize storage for the model
    pkg = {
        'data': {}, 'constants': {}, 'inits': {}, 'maps': {}
    }
    
    pkg['maps']['altimeters'] = altimeter_types
    pkg['constants']['n_altimeters'] = len(altimeter_types)
    pkg['inits']['altimeter_bias'] = np.zeros(pkg['constants']['n_altimeters'])
    pkg['inits']['altimeter_scaling'] = np.ones(pkg['constants']['n_altimeters'])
    pkg['inits']['altimeter_variance'] = np.ones(pkg['constants']['n_altimeters'])
    
    pkg['constants']['prior_altimeter_bias'] = altimeter_types.merge(priors['altimeter_bias'], on='altimeter')[['mean', 'sd']].values
    pkg['constants']['prior_altimeter_scaling'] = altimeter_types.merge(priors['altimeter_scaling'], on='altimeter')[['mean', 'sd']].values
    pkg['constants']['prior_altimeter_variance'] = altimeter_types.merge(priors['altimeter_variance'], on='altimeter')[['shape', 'rate']].values
    
    pkg['maps']['images'] = image_info['Image'].tolist()
    pkg['constants']['n_images'] = len(pkg['maps']['images'])
    pkg['inits']['image_altitude'] = image_info[list(altimeter_types['altimeter'].unique())].mean(axis=1).values
    pkg['constants']['prior_image_altitude'] = priors['image_altitude']
    
    # Format altitude measurements
    altitude_measurements_longer = image_info.melt(id_vars=['Image', 'UAS'], value_vars=altimeter_types['altimeter'].unique(), var_name='altimeter', value_name='measurement').dropna()
    
    pkg['constants']['n_altimeter_measurements'] = len(altitude_measurements_longer)
    pkg['data']['altimeter_measurement'] = altitude_measurements_longer['measurement'].values
    pkg['constants']['altimeter_measurement_image'] = altitude_measurements_longer['Image'].map({img: i+1 for i, img in enumerate(pkg['maps']['images'])}).values
    pkg['constants']['altimeter_measurement_type'] = altitude_measurements_longer['altimeter'].map({alt: i+1 for i, alt in enumerate(altimeter_types['altimeter'].unique())}).values
    
    # Pixel variance initialization
    pkg['inits']['pixel_variance'] = 1
    pkg['constants']['prior_pixel_variance'] = priors['pixel_variance']
    
    pkg['maps']['objects'] = object_list
    pkg['inits']['object_length'] = object_list.merge(training_objects[['Subject', 'Measurement', 'Timepoint', 'Length']], on=['Subject', 'Measurement', 'Timepoint'], how='left')['Length'].fillna(np.nan).values
    
    pkg['constants']['pixel_count_expected_object'] = pixel_counts.merge(object_list.reset_index().rename(columns={'index': 'ind'}), on=['Subject', 'Measurement', 'Timepoint'], how='left')['ind'].values
    pkg['constants']['image_focal_length'] = image_info['FocalLength'].values
    pkg['constants']['image_width'] = image_info['ImageWidth'].values
    pkg['constants']['image_sensor_width'] = image_info['SensorWidth'].values
    
    pkg['constants']['pixel_count_expected_image'] = pixel_counts.merge(pd.DataFrame({'Image': pkg['maps']['images'], 'ind': range(1, len(pkg['maps']['images'])+1)}), on='Image', how='left')['ind'].values
    pkg['data']['pixel_count_observed'] = pixel_counts['PixelCount'].values
    pkg['constants']['n_pixel_counts'] = len(pkg['data']['pixel_count_observed'])
    
    # Disable length models by default
    pkg['constants']['n_basic_objects'] = 0
    pkg['constants']['n_basic_object_length_constraints'] = 0
    pkg['constants']['n_growth_curve_subjects'] = 0
    
    return pkg
