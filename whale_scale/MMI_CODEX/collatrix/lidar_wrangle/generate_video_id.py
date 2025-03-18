def generate_video_id(filename, delimiter, indices):
    """
    Generate video ID from file name using selected indices.
    """
    parts = filename.split(delimiter)
    if len(parts) >= max(indices) + 1:
        return delimiter.join(parts[i] for i in indices)
    return None