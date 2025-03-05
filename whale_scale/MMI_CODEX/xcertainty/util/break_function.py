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
