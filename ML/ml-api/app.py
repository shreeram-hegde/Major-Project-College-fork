from flask import Flask, request, jsonify
import os
import cv2
import base64
import numpy as np

from core.parser import jpg_to_npy_strict_blue
from core.Final_pather import compute_path
from validator import is_geographical_image  # your heuristic validator

app = Flask(__name__)

# Base folders
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

# Single "current" grid filename (latest prepared grid)
CURRENT_GRID_NAME = "safe_GRID_current.npy"


def encode_image_to_base64(img):
    """
    Encode a BGR OpenCV image to base64 PNG string.
    """
    _, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf).decode("utf-8")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "service": "ml-api"})


@app.route("/api/prepare-grid", methods=["POST"])
def prepare_grid():
    """
    Prepare a flood/safe grid from an uploaded image.

    Expected JSON body from Node:
    {
      "imagePath": "flood-123456789.jpg"  # filename only, located in DATA_DIR
    }
    """
    try:
        payload = request.get_json(force=True) or {}
        image_name = payload.get("imagePath")
        if not image_name:
            return jsonify({
                "ok": False,
                "error": "missing_image",
                "message": "imagePath is required"
            }), 400

        # Full path to image inside ML data/ folder
        image_path = os.path.join(DATA_DIR, image_name)

        if not os.path.exists(image_path):
            return jsonify({
                "ok": False,
                "error": "invalid_image",
                "details": "file_not_found",
                "message": "Invalid Image! Upload image of a geographical location's map"
            }), 400

        # Content‑level validation: reject selfies / random photos
        if not is_geographical_image(image_path):
            return jsonify({
                "ok": False,
                "error": "invalid_image",
                "details": "failed_validator",
                "message": "Invalid Image! Upload image of a geographical location's map"
            }), 400

        # Build grid from this image
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR, exist_ok=True)

        grid_path = os.path.join(DATA_DIR, CURRENT_GRID_NAME)
        _ = jpg_to_npy_strict_blue(image_path, grid_path)

        return jsonify({
            "ok": True,
            "gridPath": os.path.basename(grid_path),
            "imagePath": os.path.basename(image_path),
        })
    except Exception as e:
        return jsonify({
            "ok": False,
            "error": "internal_error",
            "message": str(e),
        }), 500


@app.route("/api/path", methods=["POST"])
def api_path():
    """
    Compute safest path between two points, using the last prepared grid.

    Expected JSON body from Node/frontend:
    {
      "start": [x, y],
      "goal":  [x, y]
    }
    """
    try:
        payload = request.get_json(force=True) or {}
        start = payload.get("start")
        goal = payload.get("goal")

        if not (isinstance(start, (list, tuple)) and isinstance(goal, (list, tuple))):
            return jsonify({
                "ok": False,
                "error": "invalid_request",
                "message": "start and goal must be [x, y] arrays"
            }), 400

        # Convert lists -> tuples (hashable) and ensure ints
        start_px = (int(start[0]), int(start[1]))
        goal_px = (int(goal[0]), int(goal[1]))

        # Use the current grid
        grid_path = os.path.join(DATA_DIR, CURRENT_GRID_NAME)
        if not os.path.exists(grid_path):
            return jsonify({
                "ok": False,
                "error": "grid_not_ready",
                "message": "Grid not prepared. Upload an image first."
            }), 400

        # Pick the most recent image in DATA_DIR as the original map
        image_candidates = [
            f for f in os.listdir(DATA_DIR)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]
        if not image_candidates:
            return jsonify({
                "ok": False,
                "error": "image_not_found",
                "message": "Original image not found for current grid."
            }), 400

        image_candidates_paths = [
            os.path.join(DATA_DIR, f) for f in image_candidates
        ]
        image_path = max(
            image_candidates_paths,
            key=lambda p: os.path.getmtime(p)
        )

        # Run planner + (optionally stubbed) MAS
        result = compute_path(
            start_px=start_px,
            goal_px=goal_px,
            grid_npy_path=grid_path,
            original_image_path=image_path,
        )

        img_b64 = encode_image_to_base64(result["image"])

        return jsonify({
            "ok": True,
            "path": result["path"],
            "agents": result["agents"],
            "image": img_b64,
            "reasoning_text": result.get("reasoning_text", ""),
            "conclusion": result.get("conclusion", ""),
        })
    except Exception as e:
        return jsonify({
            "ok": False,
            "error": "internal_error",
            "message": str(e),
        }), 500


if __name__ == "__main__":
    app.run(port=5000, debug=True)
