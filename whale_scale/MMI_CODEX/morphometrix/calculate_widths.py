import numpy as np
from .constants import BiasTypes, MeasurementTypes, ObjectTypes

def calculate_widths(measurement_stack, bias):
    """Calculates distance in pixels for width measurements."""
    for measurement in measurement_stack:
        if measurement.get_type() == MeasurementTypes.WIDTH:
            width_array = []
            side_A_width = []
            side_B_width = []

            for item in measurement.get_objects():
                if item["type"] == ObjectTypes.ELLIPSEITEM:
                    if item["parms"].side == BiasTypes.SIDE_A:
                        side_A_width.append(item["parms"])
                    elif item["parms"].side == BiasTypes.SIDE_B:
                        side_B_width.append(item["parms"])

            for A, B in zip(side_A_width, side_B_width):
                if bias == "Side A":
                    width_array.append(np.linalg.norm(A.scenePos() - A.centerLinePoint))
                elif bias == "Side B":
                    width_array.append(np.linalg.norm(B.scenePos() - B.centerLinePoint))
                else:
                    width_array.append(np.linalg.norm(A.scenePos() - B.scenePos()))

            measurement.measurement_value = width_array

    return width_array