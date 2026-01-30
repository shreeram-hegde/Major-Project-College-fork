# Final_pather.py
# Refactored for server use: exposes compute_path(start_px, goal_px, grid_npy_path, original_image_path)

import cv2
import numpy as np
import heapq
import json
import re
from datetime import datetime

# Colors (BGR)
COLOR_FLOOD = (0, 0, 150)
COLOR_SAFE = (50, 100, 50)
COLOR_PATH = (0, 255, 0)
COLOR_A = (0, 255, 255)
COLOR_B = (203, 192, 255)

# Visualization parameters
MAX_DRAW_CELLS = 3000
OVERLAY_ALPHA = 0.45

coord_re = re.compile(r"\(?\s*(-?\d+)\s*,\s*(-?\d+)\s*\)?")

# --------------------- OLLAMA COMMUNICATION (MAS STUB) ---------------------
def call_ollama(model, prompt, temperature=0.3):
    """
    MAS reasoning disabled for now.

    This stub keeps the planner working even when no Ollama server is running.
    """
    return "[]"


# --------------------- HELPERS ---------------------
def parse_coords_from_text(text, max_coords=5000):
    if not text:
        return []
    coords = []
    for m in coord_re.findall(text):
        try:
            x = int(m[0])
            y = int(m[1])
            coords.append((x, y))
            if len(coords) >= max_coords:
                break
        except Exception:
            continue
    return coords


def safe_coord_list(coords, W, H):
    out = []
    for x, y in coords:
        if 0 <= x < W and 0 <= y < H:
            out.append((x, y))
    return out


def draw_overlay(base_img, coords, color, alpha=0.45, max_draw=MAX_DRAW_CELLS):
    overlay = base_img.copy()
    draw_count = 0
    for x, y in coords:
        if draw_count >= max_draw:
            break
        overlay[y, x] = color
        draw_count += 1
    combined = cv2.addWeighted(overlay, alpha, base_img, 1 - alpha, 0)
    return combined


# --------------------- MAS REFINEMENT ---------------------
def mas_refine_cost_grid(start_px, goal_px, grid, vis_base):
    """
    Runs 4 agents. Returns:
      - cost_grid: numpy array with modified costs
      - agent_infos: list of dicts
    """
    H, W = grid.shape
    tstamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n[M A S] RUN @ {tstamp} -- start {start_px} goal {goal_px}")

    # base cost: safe cells = 1.0, flood = very large (impassable)
    cost_grid = np.ones((H, W), dtype=np.float32) * 999.0
    cost_grid[grid == 1] = 1.0
    cost_grid[grid == 0] = 99999.0

    agent_infos = []

    # local descriptor for prompts
    def describe_zone(x, y, r=40):
        y0, y1 = max(0, y - r), min(H, y + r)
        x0, x1 = max(0, x - r), min(W, x + r)
        zone = grid[y0:y1, x0:x1]
        safe = int(np.sum(zone == 1))
        total = zone.size
        flood = total - safe
        return {
            "safe_pct": safe / total if total else 0.0,
            "safe_cells": safe,
            "flood_cells": flood,
            "area": total,
        }

    start_desc = describe_zone(*start_px)
    goal_desc = describe_zone(*goal_px)

    # -------- Agent 1: Flood Dynamics --------
    print("  Agent 1: Flood Dynamics -> predicting imminent risk")
    prompt1 = f"""
You are a hydrologist. Predict which currently SAFE cells will flood in the next 30–60 minutes.
Start zone: {json.dumps(start_desc)}
Goal zone:  {json.dumps(goal_desc)}
Return a plain Python-style list of (x,y) pairs to penalize heavily (+80 cost).
If none, return [].
Also include one short sentence explanation at the end.
"""
    out1 = call_ollama("gpt-oss:120b-cloud", prompt1) or "[]"
    coords1 = safe_coord_list(parse_coords_from_text(out1, 5000), W, H)
    applied1 = 0
    for x, y in coords1[:150]:
        if grid[y, x] == 1:
            cost_grid[y, x] += 80.0
            applied1 += 1
    agent_infos.append(
        {
            "name": "Agent 1",
            "role": "Flood Dynamics",
            "raw_output": out1.strip(),
            "coords": coords1,
            "applied_count": applied1,
            "action": "penalize",
            "effect": "+80 cost (on safe cells)",
        }
    )

    # -------- Agent 2: Corridor Strategist --------
    print("  Agent 2: Corridor Strategist -> rewarding wide corridors")
    prompt2 = f"""
You are an evacuation route planner.
Given start zone: {json.dumps(start_desc)} and goal zone: {json.dumps(goal_desc)},
return a Python-style list of up to 300 (x,y) coordinates on SAFE land that you want to reward (lower cost by 0.5).
Also include one short sentence explaining why you picked them.
"""
    out2 = call_ollama("gpt-oss:120b-cloud", prompt2) or "[]"
    coords2 = safe_coord_list(parse_coords_from_text(out2, 5000), W, H)
    applied2 = 0
    for x, y in coords2[:300]:
        if grid[y, x] == 1:
            cost_grid[y, x] = max(0.3, cost_grid[y, x] - 0.5)
            applied2 += 1
    agent_infos.append(
        {
            "name": "Agent 2",
            "role": "Corridor Strategist",
            "raw_output": out2.strip(),
            "coords": coords2,
            "applied_count": applied2,
            "action": "reward",
            "effect": "-0.5 cost (min 0.3)",
        }
    )

    # -------- Agent 3: Human Behavior --------
    print("  Agent 3: Human Behavior -> penalizing panic zones / choke points")
    prompt3 = f"""
You are a disaster psychologist.
Given start zone: {json.dumps(start_desc)} and goal zone: {json.dumps(goal_desc)},
return a Python-style list of (x,y) coordinates (up to 120) that are confusing, narrow or panic-prone which should get a penalty of +25 cost.
Also include a one-line explanation.
"""
    out3 = call_ollama("gpt-oss:120b-cloud", prompt3) or "[]"
    coords3 = safe_coord_list(parse_coords_from_text(out3, 5000), W, H)
    applied3 = 0
    for x, y in coords3[:120]:
        if grid[y, x] == 1:
            cost_grid[y, x] += 25.0
            applied3 += 1
    agent_infos.append(
        {
            "name": "Agent 3",
            "role": "Human Behavior Expert",
            "raw_output": out3.strip(),
            "coords": coords3,
            "applied_count": applied3,
            "action": "avoid",
            "effect": "+25 cost",
        }
    )

    # -------- Agent 4: Incident Commander --------
    print("  Agent 4: Incident Commander -> final directive")
    prompt4 = """
You are the Incident Commander. Summarize in one short sentence the chosen approach given the other agents' suggested modifications.
Return only a single sentence explaining which corridor/approach should be used and why.
"""
    out4 = call_ollama("gpt-oss:120b-cloud", prompt4) or "No commander response."
    commander_text = out4.strip()
    agent_infos.append(
        {
            "name": "Agent 4",
            "role": "Incident Commander",
            "raw_output": commander_text,
            "coords": [],
            "applied_count": 0,
            "action": "command",
            "effect": commander_text,
        }
    )

    return cost_grid, agent_infos


# --------------------- A* PATHFINDING ---------------------
def heuristic(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def astar_mas(start, goal, cost_grid, grid):
    H, W = grid.shape
    neighbors = [
        (0, 1),
        (1, 0),
        (0, -1),
        (-1, 0),
        (1, 1),
        (1, -1),
        (-1, 1),
        (-1, -1),
    ]
    open_set = []
    heapq.heappush(open_set, (heuristic(start, goal), 0, start))
    came_from = {}
    g_score = {start: 0}
    seen = set()

    while open_set:
        _, _, current = heapq.heappop(open_set)
        if current == goal:
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start)
            path.reverse()
            return path

        if current in seen:
            continue
        seen.add(current)

        for dx, dy in neighbors:
            nx, ny = current[0] + dx, current[1] + dy
            if not (0 <= nx < W and 0 <= ny < H):
                continue
            if grid[ny, nx] != 1:
                continue
            if cost_grid[ny, nx] >= 9999:
                continue
            step_cost = cost_grid[ny, nx] * (1.414 if dx and dy else 1.0)
            tent_g = g_score[current] + step_cost
            neighbor = (nx, ny)
            if neighbor not in g_score or tent_g < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tent_g
                f = tent_g + heuristic(neighbor, goal)
                heapq.heappush(open_set, (f, tent_g, neighbor))
    return None


# --------------------- TEXT SUMMARY FOR WEB ---------------------
def build_mas_text_summary(agent_infos, start, goal, path):
    """
    Build a textual summary similar to the OpenCV MAS reasoning window.
    Returns a single multi-line string, including paths-to-avoid notes.
    """
    lines = []
    lines.append(f"Start: {start}  |  Goal: {goal}")
    if path:
        lines.append(f"Final path length: {len(path)} steps")
    else:
        lines.append("No survivable path found by the planner.")
    lines.append("")

    # Basic per-agent summary
    for ag in agent_infos:
        name = ag.get("name", "Agent")
        role = ag.get("role", "")
        action = ag.get("action", "n/a")
        effect = ag.get("effect", "")
        applied = ag.get("applied_count", 0)
        raw = (ag.get("raw_output") or "").strip()

        lines.append(f"{name} ({role})")
        lines.append(f"  • Action: {action}  |  Effect: {effect}")
        lines.append(f"  • Cells affected: {applied}")

        if raw:
            first_line = raw.splitlines()[0][:220]
            lines.append(f"  • Summary: {first_line}")
        else:
            lines.append("  • Summary: [no details]")

        lines.append("")

    # Extra section: paths / regions to avoid (from penalty agents)
    avoid_notes = []
    for ag in agent_infos:
        role = ag.get("role", "")
        raw = (ag.get("raw_output") or "").strip().replace("\n", " ")
        if not raw:
            continue
        if "Flood Dynamics" in role or "Human Behavior" in role:
            avoid_notes.append(f"- {role}: {raw[:260]}")

    if avoid_notes:
        lines.append("Paths / regions to avoid:")
        lines.extend(avoid_notes)
        lines.append("")

    return "\n".join(lines)


# --------------------- PUBLIC ENTRY POINT ---------------------
def compute_path(start_px, goal_px, grid_npy_path, original_image_path):
    """
    High-level function to be called from your API.

    Args:
        start_px: (x, y) tuple
        goal_px:  (x, y) tuple
        grid_npy_path: path to .npy grid (0 flood, 1 safe)
        original_image_path: background image for visualization

    Returns:
        dict with keys:
            - path: list of (x,y) or None
            - agents: list of agent info dicts
            - image: OpenCV BGR numpy array with path + A/B drawn
            - reasoning_text: multi-line string summary
            - conclusion: short one-line conclusion
            - legend: description of color coding
    """
    grid = np.load(grid_npy_path)
    H, W = grid.shape

    vis_base = np.zeros((H, W, 3), dtype=np.uint8)
    vis_base[grid == 0] = COLOR_FLOOD
    vis_base[grid == 1] = COLOR_SAFE

    bg_img = cv2.imread(original_image_path)
    if bg_img is not None and bg_img.shape[:2] == (H, W):
        vis_base = cv2.addWeighted(bg_img, 0.6, vis_base, 0.4, 0)

    # Cost grid + agents
    cost_grid, agent_infos = mas_refine_cost_grid(start_px, goal_px, grid, vis_base)

    # Path
    path = astar_mas(start_px, goal_px, cost_grid, grid)

    # Draw path + A/B on result
    vis_result = vis_base.copy()
    if path:
        for (px, py) in path:
            cv2.circle(vis_result, (px, py), 4, COLOR_PATH, -1)
        cv2.circle(vis_result, start_px, 14, COLOR_A, -1)
        cv2.circle(vis_result, goal_px, 14, COLOR_B, -1)

    reasoning_text = build_mas_text_summary(agent_infos, start_px, goal_px, path)

    if path:
        conclusion = (
            f"The model selected a {len(path)}‑step route from A{start_px} to B{goal_px}, "
            "staying on safe land while avoiding high‑risk flooded areas."
        )
    else:
        conclusion = (
            "The model could not find a survivable route between A and B given the "
            "current flood conditions."
        )

    legend = {
        "safe_zone": {
            "label": "Safe land",
            "color_bgr": COLOR_SAFE,
        },
        "flood_zone": {
            "label": "Flooded / unsafe",
            "color_bgr": COLOR_FLOOD,
        },
        "path": {
            "label": "Recommended route",
            "color_bgr": COLOR_PATH,
        },
        "start": {
            "label": "Start (A)",
            "color_bgr": COLOR_A,
        },
        "goal": {
            "label": "Goal (B)",
            "color_bgr": COLOR_B,
        },
    }

    return {
        "path": path,
        "agents": agent_infos,
        "image": vis_result,
        "reasoning_text": reasoning_text,
        "conclusion": conclusion,
        "legend": legend,
    }
