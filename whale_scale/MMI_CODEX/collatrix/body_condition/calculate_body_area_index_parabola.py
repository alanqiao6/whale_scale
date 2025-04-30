'''
The following is a Python file adapted from the MMI-CODEX/CollatriX repository
https://github.com/MMI-CODEX/CollatriX

Author: Jason Fitzpatrick
'''

import numpy as np
import pandas as pd

def calculate_body_area_index_parabola(df, tl_name, interval, lower, upper):
    bai_name = f"BAIpar_{interval}perc"
    sa_name = f"SA_{interval}perc"
    wlist = [f"{tl_name}_w{format(x, '.2f')}" for x in np.arange(lower, upper + interval, interval)]

    npy = np.array(df[wlist])
    npTL = np.array(df[tl_name])
    x = np.tile(npTL.reshape(-1, 1), (1, len(wlist)))
    plist = np.array(np.arange(lower, upper + interval, interval)) / 100
    npx = x * plist

    min_tl = npTL * (lower / 100)
    max_tl = npTL * (upper / 100)
    newx = np.linspace(min_tl, max_tl, 1000)

    bais, sas, ids, imgs = [], [], [], []
    for i in range(npy.shape[0]):
        xx = npx[i, :]
        yy = npy[i, :]
        newxx = newx[:, i]
        fit = np.polyfit(xx, yy, 2)
        p = np.poly1d(fit)

        # Manual integration using trapezoidal rule
        integral = 0.0
        for j in range(len(newxx) - 1):
            x0 = newxx[j]
            x1 = newxx[j + 1]
            y0 = p(x0)
            y1 = p(x1)
            trap_area = 0.5 * (x1 - x0) * (y0 + y1)
            integral += trap_area

        sas.append(integral)  # Store surface area
        bais.append((integral / ((npTL[i] * ((upper - lower) / float(100))) ** 2)) * 100)
        ids.append(df["Image_ID"].iloc[i])
        imgs.append(df["Image"].iloc[i])

    # Create dataframe with BAI and SA values
    df_bai = pd.DataFrame({
        "Image_ID": ids,
        bai_name: bais,
        sa_name: sas,
        "Image": imgs
    })

    # Step 1: Group and sum BAI values (handles duplicate data)
    df_bai = df_bai.groupby(["Image_ID", "Image"]).sum().reset_index()

    return df_bai
