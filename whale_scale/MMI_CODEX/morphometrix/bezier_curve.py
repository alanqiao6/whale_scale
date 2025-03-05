import numpy as np
from scipy.linalg import pascal
from scipy.sparse import diags
from itertools import cycle, islice

def bezier_curve(t, P, k, arc=False):
    signs = np.array([i for j, i in zip(range(k + 1), islice(cycle([1, -1]), 0, None))])
    A = pascal(k + 1, kind='lower')
    S = diags(signs, [i - k for i in range(k + 1)][::-1], shape=(k + 1, k + 1)).toarray()
    M = A * S
    coeff = A[-1, :]
    C = M * coeff[:, None]
    T = np.array([t**i for i in range(k + 1)]).T
    B = T.dot(C.dot(P))
    return np.linalg.norm(B, axis=1) if arc else B