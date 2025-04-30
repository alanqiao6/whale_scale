'''
The following is a Python file adapted from the MMI-CODEX/CollatriX repository
https://github.com/MMI-CODEX/CollatriX

Author: Jason Fitzpatrick
'''

import math
import numpy as np
import pandas as pd

def calculate_body_volume_ellipse(df, tl_name):
    body_name = "BVell_5perc"
    ids, vs, imgs = [], [], []

    lower, upper, interval = 0, 100, 5
    volm = [f"{tl_name}_w{format(x, '.2f')}" for x in range(lower, upper + interval, interval)]
    hlist = [w.replace('w', 'h') for w in volm]
    rlist = [w.replace('w', 'ratio') for w in volm]

    for x in np.arange(5, 90, 5):
        w = f"{tl_name}_w{format(x, '.2f')}"
        h = w.replace("w", "h")
        r = w.replace("w", "ratio")
        
        if r not in df.columns:
            raise KeyError(f"Missing required column '{r}' — make sure ratio columns are computed first")

        # Create height based on ratio
        df.loc[:, h] = df[w] * df[r]

    w85 = f"{tl_name}_w85.00"
    h85 = f"{tl_name}_h85.00"

    if w85 in df.columns and h85 in df.columns:
        for x in [0, 100, 90, 95]:
            wx = f"{tl_name}_w{format(x, '.2f')}"
            hx = f"{tl_name}_h{format(x, '.2f')}"

            if x == 90:
                df[wx] = df[w85] - (1 * (df[w85] / 3))
                df[hx] = df[h85] - (1 * (df[h85] / 3))
            elif x == 95:
                df[wx] = df[w85] - (2 * (df[w85] / 3))
                df[hx] = df[h85] - (2 * (df[h85] / 3))
            else:
                df[wx] = 0
                df[hx] = 0

    def quad_function(ww, WW, hh, HH, TL, interval):
        ph = float(interval) / 100
        tl_h = float(TL) * ph

        # Elliptical frustum equation
        def efunc(x, ww, WW, hh, HH):
            return math.pi * ((ww + (WW - ww) * x) / 2) * ((hh + (HH - hh) * x) / 2)

        # Trapezoidal integration
        integral = 0.0
        num_steps = 100
        step_size = 1.0 / num_steps

        for j in range(num_steps):
            x0 = j * step_size
            x1 = (j + 1) * step_size
            y0 = efunc(x0, ww, WW, hh, HH)
            y1 = efunc(x1, ww, WW, hh, HH)
            trap_area = 0.5 * (x1 - x0) * (y0 + y1)
            integral += trap_area

        return integral * tl_h

    for i in range(len(volm) - 1):
        for w, W, h, H, TL, anid, img in zip(
            df[volm[i]], df[volm[i + 1]], df[hlist[i]], df[hlist[i + 1]],
            df[tl_name], df["Image_ID"], df["Image"]
        ):
            vol = quad_function(w, W, h, H, TL, interval)
            ids.append(anid)
            vs.append(vol)
            imgs.append(img)

    df_vol = pd.DataFrame({
        "Image_ID": ids,
        body_name: vs,
        "Image": imgs
    })

    df_vol = df_vol.groupby(["Image_ID", "Image"], as_index=False).sum()

    return df_vol
