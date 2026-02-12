# validator.py
import cv2
import numpy as np
import os

def is_geographical_image(image_path: str) -> bool:
    if not os.path.exists(image_path):
        return False

    img = cv2.imread(image_path)
    if img is None:
        return False

    h, w, _ = img.shape
    # reject very small images
    if h < 256 or w < 256:
        return False

    # resize for analysis
    img_small = cv2.resize(img, (128, 128))
    hsv = cv2.cvtColor(img_small, cv2.COLOR_BGR2HSV)
    flat = hsv.reshape(-1, 3)

    # 1) Require enough color variety (maps/satellite have lots of variation)
    unique_colors = len(np.unique(flat, axis=0))
    if unique_colors < 1500:
        return False

    # 2) Reject images dominated by "skin-like" hues (typical for selfies)
    h_vals = flat[:, 0]
    s_vals = flat[:, 1]
    v_vals = flat[:, 2]

    # loose skin-tone range in HSV
    skin_mask = (
        (h_vals >= 0) & (h_vals <= 35) &
        (s_vals >= 30) & (s_vals <= 200) &
        (v_vals >= 50)
    )
    skin_ratio = np.mean(skin_mask.astype(np.float32))
    if skin_ratio > 0.25:  # more than 25% skin-like pixels -> probably a person
        return False

    # 3) Reject overly flat images (slides, plain walls)
    std = flat.std(axis=0).mean()
    if std < 10:
        return False

    return True
