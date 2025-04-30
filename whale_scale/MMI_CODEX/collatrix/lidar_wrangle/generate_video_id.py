'''
The following is a Python file adapted from the MMI-CODEX/CollatriX repository
https://github.com/MMI-CODEX/CollatriX

Author: Jason Fitzpatrick
'''

def generate_video_id(filename, delimiter, indices):
    """
    Generate video ID from file name using selected indices.
    """
    parts = filename.split(delimiter)
    if len(parts) >= max(indices) + 1:
        return delimiter.join(parts[i] for i in indices)
    return None