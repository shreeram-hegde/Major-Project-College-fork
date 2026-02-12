from flask import Flask, request, jsonify
import os
import cv2
import base64
import numpy as np

# Adjust imports if your folder structure differs
from core.parser import jpg_to_npy_strict_blue
from core.Final_pather import compute_path
from validator import is_geographical_image

app = Flask(__name__)

# Base folders
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

def encode_image_to_base64(img):
    _, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf).decode("utf-8")

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "service": "ml-api"})

@app.route("/api/prepare-grid", methods=["POST"])
def prepare_grid():
    """
    Generate a .npy grid for a specific uploaded image.
    JSON Input: { "imagePath": "flood-123.jpg" }
    """
    try:
        payload = request.get_json(force=True) or {}
        image_name = payload.get("imagePath")
        
        if not image_name:
            return jsonify({"ok": False, "error": "missing_image"}), 400

        image_path = os.path.join(DATA_DIR, image_name)
        
        if not os.path.exists(image_path):
            return jsonify({"ok": False, "error": "file_not_found"}), 400

        # Validator
        # if not is_geographical_image(image_path):
        #      return jsonify({"ok": False, "error": "invalid_image", "message": "Not a valid map image"}), 400

        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR, exist_ok=True)

        # GENERATE UNIQUE GRID NAME: flood-123.jpg -> flood-123.npy
        base_name = os.path.splitext(image_name)[0]
        grid_name = f"{base_name}.npy"
        grid_path = os.path.join(DATA_DIR, grid_name)
        
        # Run parser
        _ = jpg_to_npy_strict_blue(image_path, grid_path)

        return jsonify({
            "ok": True,
            "gridPath": grid_name,
            "imagePath": image_name
        })
    except Exception as e:
        print(f"Prepare Grid Error: {e}")
        return jsonify({"ok": False, "error": "internal_error", "message": str(e)}), 500

@app.route("/api/path", methods=["POST"])
def api_path():
    """
    Compute path using the grid SPECIFIC to the requested image.
    JSON Input: { "start": [x,y], "goal": [x,y], "imagePath": "flood-123.jpg" }
    """
    try:
        payload = request.get_json(force=True) or {}
        start = payload.get("start")
        goal = payload.get("goal")
        image_name = payload.get("imagePath") # <--- CRITICAL: Get specific map name

        if not (start and goal and image_name):
             return jsonify({"ok": False, "error": "missing_params", "message": "Requires start, goal, and imagePath"}), 400

        start_px = (int(start[0]), int(start[1]))
        goal_px = (int(goal[0]), int(goal[1]))

        # Locate specific image and grid
        image_path = os.path.join(DATA_DIR, image_name)
        
        # Construct expected grid path (flood-123.jpg -> flood-123.npy)
        base_name = os.path.splitext(image_name)[0]
        grid_path = os.path.join(DATA_DIR, f"{base_name}.npy")

        # Fallback: If specific grid doesn't exist, try regenerating it
        if not os.path.exists(grid_path):
            if os.path.exists(image_path):
                print(f"Grid not found for {image_name}, generating now...")
                jpg_to_npy_strict_blue(image_path, grid_path)
            else:
                 return jsonify({"ok": False, "error": "map_not_found", "message": f"Map {image_name} does not exist"}), 404

        # Run Pathfinding
        result = compute_path(
            start_px=start_px,
            goal_px=goal_px,
            grid_npy_path=grid_path,       # Use the specific grid
            original_image_path=image_path # Use the specific image background
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
        print(f"Path Error: {e}")
        return jsonify({"ok": False, "error": "internal_error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)