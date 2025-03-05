def compute_polygon_area(qpolygon):
    """Computes area using the Shoelace formula."""
    S1 = sum(
        (qpolygon[i]["x"] * qpolygon[i + 1]["y"]) - (qpolygon[i]["y"] * qpolygon[i + 1]["x"])
        for i in range(len(qpolygon) - 1)
    )
    conct = (qpolygon[-1]["x"] * qpolygon[0]["y"]) - (qpolygon[-1]["y"] * qpolygon[0]["x"])
    return 0.5 * abs(S1 + conct)