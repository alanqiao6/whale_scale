import pandas as pd
import numpy as np

def handle_error(msg, action):
    """Handle errors based on specified action."""
    if action == 'message':
        print(msg)
    elif action == 'warn':
        import warnings
        warnings.warn(msg)
    elif action == 'stop':
        raise ValueError(msg)

def validate_pixel_counts(df, error='stop', verbose=True):
    """Validation checks for pixel data."""
    if not isinstance(df, pd.DataFrame):
        handle_error('Pixel counts must be in a DataFrame', error)
    
    required_columns = {'Subject', 'Measurement', 'Timepoint', 'Image', 'PixelCount'}
    missing_columns = required_columns - set(df.columns)
    if missing_columns:
        handle_error(f'Missing columns: {missing_columns}', error)
    
    if not df[['Subject', 'Measurement']].select_dtypes(include=['object']).shape[1] == 2:
        handle_error('Subject and Measurement columns must be character (string) type', error)
    
    if df.empty:
        handle_error('Must include at least one measurement to analyze.', error)
    
    if df.duplicated(subset=['Subject', 'Measurement', 'Timepoint', 'Image']).any():
        handle_error('Some Subject/Measurement/Timepoint/Image combinations appear more than once.', error)

def validate_training_objects(df, error='stop', verbose=True):
    """Validation checks for known object lengths."""
    if not isinstance(df, pd.DataFrame):
        handle_error('Training object info must be in a DataFrame', error)
    
    required_columns = {'Subject', 'Measurement', 'Timepoint', 'Length'}
    missing_columns = required_columns - set(df.columns)
    if missing_columns:
        handle_error(f'Missing columns: {missing_columns}', error)
    
    if df.duplicated(subset=['Subject', 'Measurement', 'Timepoint']).any():
        handle_error('Some training objects have more than one true length.', error)

def validate_prediction_objects(df, error='stop', verbose=True):
    """Validation checks for prediction object lengths."""
    if not isinstance(df, pd.DataFrame):
        handle_error('Prediction object info must be in a DataFrame', error)
    
    required_columns = {'Subject', 'Measurement', 'Timepoint'}
    missing_columns = required_columns - set(df.columns)
    if missing_columns:
        handle_error(f'Missing columns: {missing_columns}', error)
    
    if df.duplicated(subset=['Subject', 'Measurement', 'Timepoint']).any():
        handle_error('Some prediction objects are registered more than once.', error)

def validate_image_info(df, error='stop', verbose=True):
    """Validation checks for image metadata."""
    if not isinstance(df, pd.DataFrame):
        handle_error('Image info must be in a DataFrame', error)
    
    required_columns = {'Image', 'FocalLength', 'ImageWidth', 'SensorWidth', 'UAS'}
    missing_columns = required_columns - set(df.columns)
    if missing_columns:
        handle_error(f'Missing columns: {missing_columns}', error)
    
    if not {'Barometer', 'Laser'} & set(df.columns):
        handle_error('Neither Barometer nor Laser columns found in DataFrame.', error)
    
    if df.empty:
        handle_error('Must include at least one image to analyze.', error)
    
    if df.duplicated(subset=['Image']).any():
        handle_error('Some images have conflicting metadata.', error)
    
    altimeter_cols = {'Barometer', 'Laser'} & set(df.columns)
    if not df[list(altimeter_cols)].applymap(np.isfinite).any(axis=1).all():
        handle_error('Some images do not have any altimeter data.', error)
