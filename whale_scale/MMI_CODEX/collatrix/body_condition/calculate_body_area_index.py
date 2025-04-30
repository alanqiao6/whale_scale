'''
The following is a Python file adapted from the MMI-CODEX/CollatriX repository
https://github.com/MMI-CODEX/CollatriX

Author: Jason Fitzpatrick
'''

import pandas as pd

from .calculate_body_area_index_parabola import calculate_body_area_index_parabola
from .calculate_body_area_index_trapezoid import calculate_body_area_index_trapezoid

def calculate_body_area_index(df, tl_name, interval, lower, upper, method):
    if method == "Parabola":
        return calculate_body_area_index_parabola(df, tl_name, interval, lower, upper)
    elif method == "Trapezoid":
        return calculate_body_area_index_trapezoid(df, tl_name, interval, lower, upper)
    elif method == "Both":
        df_parabola = calculate_body_area_index_parabola(df, tl_name, interval, lower, upper)
        df_trapezoid = calculate_body_area_index_trapezoid(df, tl_name, interval, lower, upper)
        if df_parabola is not None and df_trapezoid is not None:
            df_bai = pd.merge(df_parabola, df_trapezoid, on=["Image_ID", "Image"], how="outer")
        elif df_parabola is not None:
            df_bai = df_parabola
        elif df_trapezoid is not None:
            df_bai = df_trapezoid
        else:
            return None
        return df_bai
    return None