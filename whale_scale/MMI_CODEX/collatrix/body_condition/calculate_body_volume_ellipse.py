import math
import pandas as pd

def calculate_body_volume_ellipse(df, tl_name):
    body_name = "BVell_5perc"
    ids, vs, imgs = [], [], []

    lower, upper, interval = 0, 100, 5
    volm = [f"{tl_name}_w{format(x, '.2f')}" for x in range(lower, upper + interval, interval)]
    hlist = [w.replace('w', 'h') for w in volm]

    for i in range(len(volm) - 1):
        for w, W, h, H, TL, anid, img in zip(df[volm[i]], df[volm[i + 1]], df[hlist[i]], df[hlist[i + 1]], df[tl_name], df['Image_ID'], df['Image']):
            vol = (math.pi / 3) * TL * (W * H + w * h + W * H)
            ids.append(anid)
            vs.append(vol)
            imgs.append(img)

    df_vol = pd.DataFrame({"Image_ID": ids, body_name: vs, "Image": imgs})
    return df_vol