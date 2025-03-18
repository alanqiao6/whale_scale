import math
import numpy as np
import pandas as pd

def calculate_body_volume_circle(df, tl_name, interval, lower, upper):
    body_name = f"BVcir_{interval}perc"
    
    # List of width columns
    volm = [f"{tl_name}_w{format(x, '.2f')}" for x in np.arange(float(lower), float(upper) + float(interval), float(interval))]
    colarr = np.array(df.columns)
    mask = np.isin(colarr, volm)
    cc = list(colarr[mask])

    if not cc:
        return None

    vlist = ['index', tl_name] + cc
    df['index'] = df['Image_ID'] + "*" + df['Image']
    df1 = df[vlist]

    r = df1.iloc[:, 2:].div(2)  # Calculate radii
    R = r.shift(axis=1)  # Previous radius
    p2 = ((r**2) + (r * R) + (R**2))
    p1 = (df1[tl_name] * (float(interval) / 100) * (1 / 3) * math.pi)
    v = p1[:, None] * p2
    vsum = np.nansum(v, axis=1)

    df_vol = pd.DataFrame({"index": df1['index'], body_name: vsum})
    df_vol['Image_ID'] = df_vol['index'].str.split("*").str[0]
    df_vol['Image'] = df_vol['index'].str.split("*").str[1]

    return df_vol