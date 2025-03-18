import numpy as np
import pandas as pd

def calculate_body_area_index_trapezoid(df, tl_name, interval, lower, upper):
    bai_name = f"BAItrap_{interval}perc"
    wlist = [f"{tl_name}_w{format(x, '.2f')}" for x in np.arange(lower, upper + interval, interval)]

    ids, bais, imgs = [], [], []
    for i in range(len(wlist) - 1):
        for w, W, TL, anid, img in zip(df[wlist[i]], df[wlist[i + 1]], df[tl_name], df['Image_ID'], df['Image']):
            h = TL * (float(interval) / 100)
            bais.append(0.5 * (w + W) * h)
            ids.append(anid)
            imgs.append(img)

    df_bai = pd.DataFrame({"Image_ID": ids, bai_name: bais, "Image": imgs})
    return df_bai