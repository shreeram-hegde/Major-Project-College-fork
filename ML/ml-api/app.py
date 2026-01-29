from flask import Flask, request, jsonify
import os
import cv2
import base64
import numpy as np

# make sure core is a package: ML/ml-api/core/__init__.py exists
from core.parser import jpg_to_npy_strict_blue
from core.Final_pather import compute_path


app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")


def encode_image_to_base64(img):
    _, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf).decode("utf-8")


@app.route("/api/prepare-grid", methods=["POST"])
def prepare_grid():
    # expects { "imagePath": "sample.jpg" } OR uses default
    image_name = request.json.get("imagePath", "sample.jpg")
    image_path = os.path.join(DATA_DIR, image_name)
    grid_path = os.path.join(DATA_DIR, "safe_GRID_4.npy")

    # use the refactored parser; keep same output contract
    grid = jpg_to_npy_strict_blue(image_path, grid_path)

    return jsonify({
        "message": "grid generated",
        "shape": list(grid.shape),
        "gridPath": "safe_GRID_4.npy"
    })


@app.route("/api/path", methods=["POST"])
def api_path():
    body = request.json
    start = tuple(body["start"])  # [x, y]
    goal = tuple(body["goal"])    # [x, y]

    grid_path = os.path.join(DATA_DIR, "safe_GRID_4.npy")
    image_path = os.path.join(DATA_DIR, "sample.jpg")

    # call the refactored compute_path; same args as before
    result = compute_path(
        start_px=start,
        goal_px=goal,
        grid_npy_path=grid_path,
        original_image_path=image_path,
    )
    img_b64 = encode_image_to_base64(result["image"])

    return jsonify({
        "path": result["path"],
        "agents": result["agents"],
        "image": img_b64
    })


if __name__ == "__main__":
    app.run(port=5000, debug=True)
