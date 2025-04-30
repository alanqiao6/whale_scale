'''
The following is a Python file adapted from the MMI-CODEX/CollatriX repository
https://github.com/MMI-CODEX/CollatriX

Author: Jason Fitzpatrick
'''

import datetime
import numpy as np
import pandas as pd
import xml.etree.ElementTree as ET

def wrangle_lemhex_lidar(file_list):
    laser_data = []

    for log in file_list:
        root = ET.parse(log).getroot()
        alt_collection = root[1][1]

        for alt_point in alt_collection.findall('trkpt'):
            date_time = alt_point.find('time').text
            date = date_time.split("T")[0]
            time = date_time.split("T")[1].split(".")[0]
            gpxdatetime = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M:%S")

            lat = float(alt_point.attrib['lat'])
            lon = float(alt_point.attrib['lon'])

            extensions = alt_point.find("extensions")
            laser = float(extensions.find('Laser').text)

            laser_data.append([gpxdatetime, laser, lat, lon])

    laser_all = pd.DataFrame(laser_data, columns=['CorrDT', 'Laser_Alt', 'lat', 'lon'])
    laser_all['Laser_Alt'] = laser_all['Laser_Alt'].replace(130.00, np.nan)

    laser_all = laser_all.groupby('CorrDT').agg({
        'lat': 'first',
        'lon': 'first',
        'Laser_Alt': 'mean'
    }).reset_index()

    return laser_all
