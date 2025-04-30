'''
The following is a Python file adapted from the MMI-CODEX/CollatriX repository
https://github.com/MMI-CODEX/CollatriX

Author: Jason Fitzpatrick
'''

def extract_time_from_filename(filename, delimiter, indices):
    """
    Extract time from file name based on index positions.
    """
    parts = filename.split(delimiter)
    if len(parts) >= max(indices) + 1:
        hr = parts[indices[0]]
        mn = parts[indices[1]]
        sc = parts[indices[2]]
        return f"{hr}:{mn}:{sc}"
    return None