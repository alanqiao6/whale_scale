import numpy as np
from morphometrix.bezier_curve import bezier_curve

def gauss_legendre(b, f, P, k, arc, loc = 0.0, L = 1, degree = 24, a = 0):
    x, w = np.polynomial.legendre.leggauss(degree)
    t = 0.5*(b-a)*x + 0.5*(b+a)

    return 0.5*(b-a)*np.sum( w*bezier_curve(t,P,k,arc) )/L - loc