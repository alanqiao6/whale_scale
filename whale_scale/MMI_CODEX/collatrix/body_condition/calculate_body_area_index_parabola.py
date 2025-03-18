import numpy as np
import pandas as pd

def calculate_body_area_index_parabola(df, tl_name, interval, lower, upper):
    bai_name = f"BAIpar_{interval}perc"
    wlist = [f"{tl_name}_w{format(x, '.2f')}" for x in np.arange(lower, upper + interval, interval)]

    npy = np.array(df[wlist])
    npTL = np.array(df[tl_name])
    x = np.tile(npTL.reshape(-1, 1), (1, len(wlist)))
    plist = np.array(np.arange(lower, upper + interval, interval)) / 100
    npx = x * plist

    bais = []
    for i in range(npy.shape[0]):
        fit = np.polyfit(npx[i], npy[i], 2)
        p = np.poly1d(fit)
        integral = np.trapz(p(np.linspace(min(npx[i]), max(npx[i]), 100)))
        bais.append(integral)

    df_bai = pd.DataFrame({"Image_ID": df["Image_ID"], bai_name: bais, "Image": df["Image"]})
    return df_bai