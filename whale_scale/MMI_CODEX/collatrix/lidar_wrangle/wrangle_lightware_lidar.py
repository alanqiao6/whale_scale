import numpy as np
import pandas as pd

def wrangle_lightware_lidar(file_list, gimbal_type):
    laser_all = pd.DataFrame()

    for file in file_list:
        df_laser = pd.read_csv(file, sep='\t', skiprows=2)
        df_laser['laser_altitude_cm'] = df_laser['laser_altitude_cm'].replace({13000: np.nan, 15000: np.nan})

        if gimbal_type == 'fixed':
            # Apply tilt correction
            df_laser['converted'] = np.cos(np.radians(df_laser['tilt_deg']))
            df_laser['Laser_Alt'] = (df_laser['laser_altitude_cm'] * df_laser['converted']) / 100
        elif gimbal_type == 'gimbaled':
            df_laser['Laser_Alt'] = df_laser['laser_altitude_cm'] / 100

        df_laser['CorrDT'] = pd.to_datetime(df_laser['#gmt_date'] + ' ' + df_laser['gmt_time'],
                                            format='%Y/%m/%d %H:%M:%S')
        laser_all = pd.concat([laser_all, df_laser])

    # Keep only relevant columns
    laser_all = laser_all[['CorrDT', 'Laser_Alt']].dropna()

    return laser_all
