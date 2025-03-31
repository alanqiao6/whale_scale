import math
import numpy as np
import pandas as pd

def calculate_body_volume_circle(df, tl_name, interval, lower, upper):
    body_name = "BVcir_{0}perc".format(interval) # Name of body volume column will use interval amount
    
    # Create list of width column names based on interval
    volm = ["{0}_w{1}".format(tl_name, format(x, f".{2}f")) for x in np.arange(float(lower), (float(upper) + float(interval)), float(interval))]
    
    # Check that those columns are in the dataframe
    colarr = np.array(df.columns)
    mask = np.isin(colarr, volm)
    cc = list(colarr[mask])
    
    # Define columns to extract
    vlist = ['index', tl_name]
    vlist.extend(cc)
    
    # Create an index column combining Image_ID and Image
    df['index'] = df['Image_ID'] + "*" + df['Image']
    
    # Subset dataframe to the columns of interest
    df1 = df[vlist].copy()
    
    # Add a spacer column (filled with NaNs) for rolling purposes
    df1['spacer'] = np.nan
    
    # Convert dataframe to numpy array
    dfnp = np.array(df1)
    
    # Extract IDs and TL values
    ids = dfnp[:, 0]
    tl = dfnp[:, 1]
    
    # Calculate radii from widths (width / 2)
    r = (dfnp[:, 2:]) / 2
    R = np.roll(r, 1, axis=1) # Shift widths over by one
    
    # Calculate volume using the frustum formula
    p2 = (r ** 2) + (r * R) + (R ** 2)
    p1 = (tl * (float(interval) / 100)) * (1 / 3) * math.pi
    v = p1[:, None] * p2
    
    # Sum volumes per ID
    vsum = np.nansum(v, axis=1)
    
    # Create result dataframe
    vol_arr = np.column_stack((ids, vsum))
    dfvx = pd.DataFrame(data=vol_arr, columns=["index", body_name])
    
    # Split index back into Image_ID and Image columns
    dfvx['Image_ID'] = [x.split("*")[0] for x in dfvx['index']]
    dfvx['Image'] = [x.split("*")[1] for x in dfvx['index']]
    dfvx = dfvx.drop(["index"], axis=1)
    
    # Group by Image_ID and Image to remove duplicates and sum values
    df_vol = dfvx.groupby(['Image_ID', 'Image'])[body_name].sum().reset_index()
    
    return df_vol

