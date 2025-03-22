import numpy as np
import pandas as pd

def calculate_body_area_index_trapezoid(df, tl_name, interval, lower, upper):
    bai_name = f"BAItrap_{interval}perc"
    wlist = [f"{tl_name}_w{format(x, '.2f')}" for x in np.arange(lower, upper + interval, interval)]

    ids, bais, imgs = [], [], []
    for i in range(len(wlist) - 1):
        for w, W, TL, anid, img in zip(df[wlist[i]], df[wlist[i + 1]], df[tl_name], df['Image_ID'], df['Image']):
            h = TL * (float(interval) / 100)
            sa1 = 0.5 * (w + W) * h
            ids.append(anid)
            bais.append(sa1)
            imgs.append(img)

    # Step 1: Create the dataframe
    df_bai = pd.DataFrame({"Image_ID": ids, bai_name: bais, "Image": imgs})

    # Step 2: Group by Image_ID and Image (sum BAI values)
    df1 = df_bai.groupby(['Image_ID', 'Image'])[bai_name].sum().reset_index()

    # Step 3: Merge with original data to normalize values
    df_out = df.merge(df1, on=['Image_ID', 'Image'], how='left')
    
    # Step 4: Normalize BAI value
    df_out[bai_name] = (df_out[bai_name] / ((df_out[tl_name] * ((upper - lower) / float(100)))**2)) * 100

    # Step 5: Drop the original TL name column
    df_out = df_out.drop([tl_name], axis=1)

    return df_out
