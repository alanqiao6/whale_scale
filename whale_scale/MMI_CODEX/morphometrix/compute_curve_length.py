'''
The following is a Python file adapted from the MMI-CODEX/MorphometriX repository
https://github.com/MMI-CODEX/MorphometriX

Author: Jason Fitzpatrick
'''

import numpy as np
from .bezier_curve import bezier_curve

def compute_curve_length(control_points):
    nt = 100
    t = np.linspace(0.0, 1.0, nt)
    k = len(control_points) - 1
    P = np.vstack(control_points)
    B = bezier_curve(t, P, k)
    Q = k * np.diff(P, axis=0)
    length = np.sum(np.linalg.norm(Q, axis=1))
    return B, length, Q, k, P