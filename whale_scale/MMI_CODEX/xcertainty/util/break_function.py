'''
The following is a Python file adapted from the following breakFun.R file in the MMI-CODEX
https://github.com/MMI-CODEX/Xcertainty/blob/main/R/breakFun.R

Author: Jason Fitzpatrick
'''

def break_fun(B: float, delta: float) -> int:
    """Break function implementing a Heaviside step function.
    Returns 1 if B <= delta, else returns 0.
    
    Args:
        B (float): Value to evaluate function at.
        delta (float): Breakpoint location.
    
    Returns:
        int: 1 if B <= delta, otherwise 0.
    """
    return 1 if B <= delta else 0
