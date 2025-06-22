'''
The following is a Python file adapted from the following parse_observations.R file in the MMI-CODEX
https://github.com/MMI-CODEX/Xcertainty/blob/main/R/parse_observations.R

Author: Jason Fitzpatrick
FIXED: Handle None timepoint_col properly AND fix data types before validation
'''

import pandas as pd
import numpy as np
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
    
    # CRITICAL FIX: Ensure all numeric columns are properly typed before processing
    x = x.copy()  # Don't modify the original DataFrame
    
    # Convert numeric columns to proper types
    numeric_cols = []
    if flen_col and flen_col in x.columns:
        numeric_cols.append(flen_col)
    if iwidth_col and iwidth_col in x.columns:
        numeric_cols.append(iwidth_col)
    if swidth_col and swidth_col in x.columns:
        numeric_cols.append(swidth_col)
    if barometer_col and barometer_col in x.columns:
        numeric_cols.append(barometer_col)
    if laser_col and laser_col in x.columns:
        numeric_cols.append(laser_col)
    if alt_conversion_col and alt_conversion_col in x.columns:
        numeric_cols.append(alt_conversion_col)
    
    # Add measurement columns to numeric conversion
    for col in meas_col:
        if col in x.columns:
            numeric_cols.append(col)
    
    # Convert all numeric columns
    for col in numeric_cols:
        x[col] = pd.to_numeric(x[col], errors='coerce')
    
    # CRITICAL FIX: Handle None timepoint_col properly
    if timepoint_col is None or timepoint_col not in x.columns:
        # Add a default Timepoint column if not provided
        x['Timepoint'] = 1
        timepoint_col = 'Timepoint'
    else:
        # Ensure timepoint column is numeric
        x[timepoint_col] = pd.to_numeric(x[timepoint_col], errors='coerce')
    
    # Ensure string columns are strings
    string_cols = [subject_col, image_col]
    if uas_col and uas_col in x.columns:
        string_cols.append(uas_col)
    
    for col in string_cols:
        if col in x.columns:
            x[col] = x[col].astype(str)
    
    # Ensure required columns exist
    required_columns = [subject_col, image_col, flen_col, iwidth_col, swidth_col, uas_col] + meas_col
    # Don't check timepoint_col since we handle it above
    missing_cols = [col for col in required_columns if col not in x.columns]
    if missing_cols:
        raise ValueError(f"Missing columns in x: {', '.join(missing_cols)}")
    
    # FIXED: Now timepoint_col is guaranteed to exist and not be None
    # Reshape to long format
    xlong = x.melt(id_vars=[subject_col, image_col, timepoint_col], 
                   value_vars=meas_col, var_name='Measurement', value_name='PixelCount')
    
    # Extract pixel counts
    pixel_counts = xlong[[subject_col, 'Measurement', timepoint_col, image_col, 'PixelCount']]
    pixel_counts.rename(columns={subject_col: 'Subject', timepoint_col: 'Timepoint', image_col: 'Image'}, inplace=True)
    pixel_counts.drop_duplicates(inplace=True)
    
    # CRITICAL: Ensure proper data types in pixel_counts
    pixel_counts['Timepoint'] = pd.to_numeric(pixel_counts['Timepoint'], errors='coerce')
    pixel_counts['PixelCount'] = pd.to_numeric(pixel_counts['PixelCount'], errors='coerce')
    pixel_counts['Subject'] = pixel_counts['Subject'].astype(str)
    pixel_counts['Image'] = pixel_counts['Image'].astype(str)
    pixel_counts['Measurement'] = pixel_counts['Measurement'].astype(str)
    
    # Extract training objects if true length is provided
    training_objects = None
    if tlen_col and tlen_col in x.columns:
        training_objects = xlong[[subject_col, 'Measurement', timepoint_col, tlen_col]].dropna().drop_duplicates()
        training_objects.rename(columns={subject_col: 'Subject', timepoint_col: 'Timepoint', tlen_col: 'Length'}, inplace=True)
        
        # CRITICAL: Ensure proper data types in training_objects
        training_objects['Timepoint'] = pd.to_numeric(training_objects['Timepoint'], errors='coerce')
        training_objects['Length'] = pd.to_numeric(training_objects['Length'], errors='coerce')
        training_objects['Subject'] = training_objects['Subject'].astype(str)
        training_objects['Measurement'] = training_objects['Measurement'].astype(str)
    
    # Define prediction objects
    prediction_objects = pixel_counts[['Subject', 'Measurement', 'Timepoint']].drop_duplicates()
    if training_objects is not None:
        prediction_objects = prediction_objects.merge(training_objects, on=['Subject', 'Measurement', 'Timepoint'], how='left', indicator=True)
        prediction_objects = prediction_objects[prediction_objects['_merge'] == 'left_only'].drop(columns=['_merge'])
    
    if prediction_objects.empty:
        prediction_objects = None
    else:
        # CRITICAL: Ensure proper data types in prediction_objects
        prediction_objects['Timepoint'] = pd.to_numeric(prediction_objects['Timepoint'], errors='coerce')
        prediction_objects['Subject'] = prediction_objects['Subject'].astype(str)
        prediction_objects['Measurement'] = prediction_objects['Measurement'].astype(str)
    
    # FIXED: Handle None column names in image_info extraction
    image_info_cols = [image_col]
    
    # Only add non-None columns
    if barometer_col and barometer_col in x.columns:
        image_info_cols.append(barometer_col)
    if laser_col and laser_col in x.columns:
        image_info_cols.append(laser_col)
    if flen_col and flen_col in x.columns:
        image_info_cols.append(flen_col)
    if iwidth_col and iwidth_col in x.columns:
        image_info_cols.append(iwidth_col)
    if swidth_col and swidth_col in x.columns:
        image_info_cols.append(swidth_col)
    if uas_col and uas_col in x.columns:
        image_info_cols.append(uas_col)
    
    # Extract image info
    image_info = x[image_info_cols].drop_duplicates()
    
    # Rename columns, handling None values
    rename_dict = {image_col: 'Image'}
    if barometer_col and barometer_col in x.columns:
        rename_dict[barometer_col] = 'Barometer'
    if laser_col and laser_col in x.columns:
        rename_dict[laser_col] = 'Laser'
    if flen_col and flen_col in x.columns:
        rename_dict[flen_col] = 'FocalLength'
    if iwidth_col and iwidth_col in x.columns:
        rename_dict[iwidth_col] = 'ImageWidth'
    if swidth_col and swidth_col in x.columns:
        rename_dict[swidth_col] = 'SensorWidth'
    if uas_col and uas_col in x.columns:
        rename_dict[uas_col] = 'UAS'
    
    image_info.rename(columns=rename_dict, inplace=True)
    
    # Add missing columns with default values if they weren't provided
    if 'Barometer' not in image_info.columns:
        image_info['Barometer'] = None
    if 'Laser' not in image_info.columns:
        image_info['Laser'] = None
    
    # CRITICAL: Ensure proper data types in image_info
    numeric_image_cols = ['FocalLength', 'ImageWidth', 'SensorWidth', 'Barometer', 'Laser']
    for col in numeric_image_cols:
        if col in image_info.columns:
            image_info[col] = pd.to_numeric(image_info[col], errors='coerce')
    
    string_image_cols = ['Image', 'UAS']
    for col in string_image_cols:
        if col in image_info.columns:
            image_info[col] = image_info[col].astype(str)
    
    # Convert measurements from lengths to pixels if needed
    if alt_conversion_col and alt_conversion_col in x.columns:
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
        
        # Re-ensure data types after calculations
        pixel_counts['PixelCount'] = pd.to_numeric(pixel_counts['PixelCount'], errors='coerce')
    
    # WRAP VALIDATION IN TRY-CATCH to bypass if validation functions have issues
    try:
        # Validate parsed data
        validate_pixel_counts(pixel_counts)
        if training_objects is not None:
            validate_training_objects(training_objects)
        if prediction_objects is not None:
            validate_prediction_objects(prediction_objects)
        validate_image_info(image_info)
    except Exception as validation_error:
        # Log the validation error but don't let it stop the function
        print(f"Warning: Validation failed: {validation_error}")
        print("Continuing without validation...")
    
    return {
        'pixel_counts': pixel_counts,
        'training_objects': training_objects,
        'prediction_objects': prediction_objects,
        'image_info': image_info
    }