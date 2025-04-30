'''
The following is a Python file adapted from the following parse_observations.R file in the MMI-CODEX
https://github.com/MMI-CODEX/Xcertainty/blob/main/R/parse_observations.R

Author: Jason Fitzpatrick
'''

import pandas as pd
from ..util.data_validation import validate_image_info, validate_pixel_counts, validate_prediction_objects, validate_training_objects

def parse_observations(x, subject_col, meas_col, tlen_col=None, image_col=None, 
                        barometer_col=None, laser_col=None, flen_col=None, 
                        iwidth_col=None, swidth_col=None, uas_col=None, 
                        timepoint_col=None, alt_conversion_col=None):
    """Pre-process photogrammetric data from wide-format to long-format.
    
    Args:
        x (pd.DataFrame): Wide-format dataframe describing images and measurements.
        subject_col (str): Column name for subject IDs.
        meas_col (list of str): Column names for pixel-count measurements.
        tlen_col (str, optional): Column with true length values.
        image_col (str): Column name containing image names.
        barometer_col (str, optional): Column with barometer altimeter values.
        laser_col (str, optional): Column with laser altimeter values.
        flen_col (str): Column name for camera focal lengths.
        iwidth_col (str): Column name for image widths (pixels).
        swidth_col (str): Column name for sensor widths (mm).
        uas_col (str): Column name for UAS name/ID.
        timepoint_col (str, optional): Column with measurement timepoints.
        alt_conversion_col (str, optional): Column with altitude for pixel conversion.
    
    Returns:
        dict: Processed data containing pixel counts, training objects, prediction objects, and image info.
    """
    if barometer_col is None and laser_col is None:
        raise ValueError("Must provide barometer and/or laser altimeter data.")
    
    if not isinstance(x, pd.DataFrame):
        raise ValueError("x must be a pandas DataFrame.")
    
    # Ensure required columns exist
    required_columns = [subject_col, image_col, flen_col, iwidth_col, swidth_col, uas_col] + meas_col
    missing_cols = [col for col in required_columns if col not in x.columns]
    if missing_cols:
        raise ValueError(f"Missing columns in x: {', '.join(missing_cols)}")
    
    # Reshape to long format
    xlong = x.melt(id_vars=[subject_col, image_col, timepoint_col], 
                   value_vars=meas_col, var_name='Measurement', value_name='PixelCount')
    
    # Extract pixel counts
    pixel_counts = xlong[[subject_col, 'Measurement', timepoint_col, image_col, 'PixelCount']]
    pixel_counts.rename(columns={subject_col: 'Subject', timepoint_col: 'Timepoint', image_col: 'Image'}, inplace=True)
    pixel_counts.drop_duplicates(inplace=True)
    
    if 'Timepoint' not in pixel_counts.columns or pixel_counts['Timepoint'].isna().all():
        pixel_counts['Timepoint'] = 1  # Default timepoint
    
    # Extract training objects if true length is provided
    training_objects = None
    if tlen_col:
        training_objects = xlong[[subject_col, 'Measurement', timepoint_col, tlen_col]].dropna().drop_duplicates()
        training_objects.rename(columns={subject_col: 'Subject', timepoint_col: 'Timepoint', tlen_col: 'Length'}, inplace=True)
        if 'Timepoint' not in training_objects.columns or training_objects['Timepoint'].isna().all():
            training_objects['Timepoint'] = 1  # Default timepoint
    
    # Define prediction objects
    prediction_objects = pixel_counts[['Subject', 'Measurement', 'Timepoint']].drop_duplicates()
    if training_objects is not None:
        prediction_objects = prediction_objects.merge(training_objects, on=['Subject', 'Measurement', 'Timepoint'], how='left', indicator=True)
        prediction_objects = prediction_objects[prediction_objects['_merge'] == 'left_only'].drop(columns=['_merge'])
    
    if prediction_objects.empty:
        prediction_objects = None
    
    # Extract image info
    image_info = x[[image_col, barometer_col, laser_col, flen_col, iwidth_col, swidth_col, uas_col]].drop_duplicates()
    image_info.rename(columns={
        image_col: 'Image', barometer_col: 'Barometer', laser_col: 'Laser', 
        flen_col: 'FocalLength', iwidth_col: 'ImageWidth', 
        swidth_col: 'SensorWidth', uas_col: 'UAS'
    }, inplace=True)
    
    # Convert measurements from lengths to pixels if needed
    if alt_conversion_col:
        pixel_counts = pixel_counts.merge(
            image_info.merge(x, left_on='Image', right_on=image_col), 
            on='Image'
        )
        pixel_counts['GSD'] = (
            pixel_counts[alt_conversion_col] * pixel_counts['SensorWidth'] /
            pixel_counts['FocalLength'] / pixel_counts['ImageWidth']
        )
        pixel_counts['PixelCount'] /= pixel_counts['GSD']
        pixel_counts = pixel_counts[['Subject', 'Measurement', 'Timepoint', 'Image', 'PixelCount']].drop_duplicates()
    
    # Validate parsed data
    validate_pixel_counts(pixel_counts)
    if training_objects is not None:
        validate_training_objects(training_objects)
    if prediction_objects is not None:
        validate_prediction_objects(prediction_objects)
    validate_image_info(image_info)
    
    return {
        'pixel_counts': pixel_counts,
        'training_objects': training_objects,
        'prediction_objects': prediction_objects,
        'image_info': image_info
    }
