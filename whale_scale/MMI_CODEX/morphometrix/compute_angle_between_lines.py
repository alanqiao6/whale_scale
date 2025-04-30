'''
The following is a Python file adapted from the MMI-CODEX/MorphometriX repository
https://github.com/MMI-CODEX/MorphometriX

Author: Jason Fitzpatrick
'''

import numpy as np

def compute_angle_between_lines(line1, line2):
    """
    Compute the angle between two line segments.
    
    Each line segment is represented as a dictionary with 'x1', 'y1', 'x2', 'y2' keys.
    """
    def get_direction_vector(line):
        return np.array([line["x2"] - line["x1"], line["y2"] - line["y1"]])

    vector1 = get_direction_vector(line1)
    vector2 = get_direction_vector(line2)

    dot_product = np.dot(vector1, vector2)
    norm1 = np.linalg.norm(vector1)
    norm2 = np.linalg.norm(vector2)
    cos_angle = dot_product / (norm1 * norm2)
    cos_angle = np.clip(cos_angle, -1.0, 1.0)

    angle_radians = np.arccos(cos_angle)
    angle_degrees = np.degrees(angle_radians)

    return angle_degrees