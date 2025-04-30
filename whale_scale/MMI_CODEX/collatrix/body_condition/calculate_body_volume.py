'''
The following is a Python file adapted from the MMI-CODEX/CollatriX repository
https://github.com/MMI-CODEX/CollatriX

Author: Jason Fitzpatrick
'''

import pandas as pd

from .calculate_body_volume_circle import calculate_body_volume_circle
from .calculate_body_volume_ellipse import calculate_body_volume_ellipse

def calculate_body_volume(df, tl_name, interval, lower, upper, method):
    if method == "Circle":
        return calculate_body_volume_circle(df, tl_name, interval, lower, upper)
    elif method == "Ellipse":
        return calculate_body_volume_ellipse(df, tl_name)
    elif method == "Both":
        df_circle = calculate_body_volume_circle(df, tl_name, interval, lower, upper)
        df_ellipse = calculate_body_volume_ellipse(df, tl_name)
        if df_circle is not None and df_ellipse is not None:
            df_vol = pd.merge(df_circle, df_ellipse, on=["Image_ID", "Image"], how="outer")
        elif df_circle is not None:
            df_vol = df_circle
        elif df_ellipse is not None:
            df_vol = df_ellipse
        else:
            return None
        return df_vol
    return None