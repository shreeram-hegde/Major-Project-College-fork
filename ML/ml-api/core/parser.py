# parser.py
# Utility to convert a flood map image into a binary navigation grid (0 = flood, 1 = safe)

import cv2
import numpy as np


def jpg_to_npy_strict_blue(image_path, save_path="safe_GRID_4.npy"):
    """
    Converts any image to a binary navigation grid:
    - ANY shade of blue (light, dark, cyan, turquoise...) → 0 (flooded/unsafe)
    - All other colors → 1 (safe land)

    Saves as .npy file for your path planner and returns the numpy grid.
    GUI preview is removed so this can run on a server.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Image not found: {image_path}")

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # Extremely broad blue detection — catches ALL blues
    blue_masks = [
        cv2.inRange(hsv, np.array([100, 30, 30]), np.array([130, 255, 255])),  # main blue
        cv2.inRange(hsv, np.array([80,  30, 20]), np.array([150, 255, 255])),  # wide blue/cyan
        cv2.inRange(hsv, np.array([90,  50, 50]), np.array([140, 255, 255])),  # strong blue
        cv2.inRange(hsv, np.array([0,   0,  0]), np.array([180, 255, 80])),    # very dark blues
    ]

    # Combine all blue detections
    final_blue_mask = blue_masks[0]
    for mask in blue_masks[1:]:
        final_blue_mask = cv2.bitwise_or(final_blue_mask, mask)

    # Create grid: blue → 0, non-blue → 1
    grid = np.where(final_blue_mask > 0, 0, 1).astype(np.uint8)

    # Save
    np.save(save_path, grid)

    return grid
