# Generated from: pather(upgrade).ipynb
# Converted at: 2026-02-01T05:46:28.272Z
# Next step (optional): refactor into modules & generate tests with RunCell
# Quick start: pip install runcell

import cv2
import numpy as np
import heapq
import requests
import json
import re
from datetime import datetime
from textwrap import wrap

# --------------------------------------------------------------
# FLOOD EVACUATION PLANNER + MAS AGENT INFLUENCE VISUALIZER
# ENHANCED: Multiple Base Stations with Shortest Path Highlighting
# Click A (emergency) -> Click B1, B2, B3... (bases) -> Press SPACE to compute
# --------------------------------------------------------------

# --------------------- CONFIG ---------------------
GRID_NPY = "input.npy"
ORIGINAL_IMAGE = "input.jpg"
OUTPUT_IMAGE = "flood_path_ai_result_4.png"

# Colors (BGR)
COLOR_FLOOD = (0, 0, 150)      # Dark red = flooded
COLOR_SAFE  = (50, 100, 50)    # Greenish-brown = safe land
COLOR_PATH_ALT = (0, 255, 0)   # Green for alternative paths
COLOR_PATH_SHORTEST = (0, 255, 255)  # Yellow for shortest path
COLOR_EMERGENCY = (0, 0, 255)  # Red for emergency point
COLOR_BASE = (255, 0, 255)     # Magenta for base stations

# influence overlay colors (BGR)
COLOR_PENALIZE = (0, 0, 200)   # red-ish overlay (penalized cells)
COLOR_REWARD   = (0, 200, 0)   # green overlay (rewarded cells)
COLOR_AVOID    = (0, 200, 200) # yellow/cyan overlay (avoid cells)

# visualization parameters
MAX_DRAW_CELLS = 3000
OVERLAY_ALPHA = 0.45

# --------------------- LOAD GRID & VIS ---------------------
grid = np.load(GRID_NPY)
H, W = grid.shape

# RECONSTRUCT VISUAL
vis_base = np.zeros((H, W, 3), dtype=np.uint8)
vis_base[grid == 0] = COLOR_FLOOD
vis_base[grid == 1] = COLOR_SAFE

# Blend with real satellite image
bg_img = cv2.imread(ORIGINAL_IMAGE)
if bg_img is not None and bg_img.shape[:2] == (H, W):
    vis_base = cv2.addWeighted(bg_img, 0.6, vis_base, 0.4, 0)

vis = vis_base.copy()

# --------------------- OLLAMA COMMUNICATION ---------------------
def call_ollama(model, prompt, temperature=0.3):
    """Simple Ollama call returning raw text response or None on failure."""
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature, "num_ctx": 4096}
    }
    try:
        r = requests.post(url, json=payload, timeout=120)
        r.raise_for_status()
        return r.json().get("response", "").strip()
    except Exception as e:
        print(f"Ollama error ({model}): {e}")
        return None

# --------------------- HELPERS ---------------------
coord_re = re.compile(r'\(?\s*(-?\d+)\s*,\s*(-?\d+)\s*\)?')

def parse_coords_from_text(text, max_coords=5000):
    """Extract (x,y) integer coords from free text robustly using regex."""
    if not text:
        return []
    coords = []
    for m in coord_re.findall(text):
        try:
            x = int(m[0]); y = int(m[1])
            coords.append((x, y))
            if len(coords) >= max_coords:
                break
        except:
            continue
    return coords

def safe_coord_list(coords):
    """Filter coords to valid in-grid coordinates"""
    out = []
    for x, y in coords:
        if 0 <= x < W and 0 <= y < H:
            out.append((x, y))
    return out

def draw_overlay(base_img, coords, color, alpha=0.45, max_draw=MAX_DRAW_CELLS):
    """Draw semi-transparent overlay for a set of coords onto base_img (returns new img)"""
    overlay = base_img.copy()
    draw_count = 0
    for x, y in coords:
        if draw_count >= max_draw:
            break
        overlay[y, x] = color
        draw_count += 1
    combined = cv2.addWeighted(overlay, alpha, base_img, 1 - alpha, 0)
    return combined

def small_text_window(title, lines, size=(700, 800)):
    """Create an OpenCV image with wrapped text lines and display in a named window."""
    w, h = size
    img = np.ones((h, w, 3), dtype=np.uint8) * 18
    margin = 12
    y = 24
    cv2.putText(img, title, (margin, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (230,230,230), 2)
    y += 28
    max_lines = (h - y) // 16
    wrapped_lines = []
    for line in lines:
        wrapped_lines.extend(wrap(line, 90))
    for i, line in enumerate(wrapped_lines[-max_lines:]):
        cv2.putText(img, line, (margin, y + i*16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (210,210,210), 1)
    cv2.imshow(title, img)

# --------------------- MULTI-AGENT COST GRID REFINEMENT ---------------------
def mas_refine_cost_grid(start_px, goal_list):
    """
    Runs 4 agents. Now handles multiple goals.
    Returns: cost_grid, agent_infos
    """
    tstamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n[M A S] RUN @ {tstamp} -- emergency {start_px} bases {goal_list}")

    # base cost: safe cells = 1.0, flood = very large (impassable)
    cost_grid = np.ones((H, W), dtype=np.float32) * 999.0
    cost_grid[grid == 1] = 1.0
    cost_grid[grid == 0] = 99999.0

    agent_infos = []

    def describe_zone(x, y, r=40):
        y0, y1 = max(0, y-r), min(H, y+r)
        x0, x1 = max(0, x-r), min(W, x+r)
        zone = grid[y0:y1, x0:x1]
        safe = int(np.sum(zone == 1))
        total = zone.size
        flood = total - safe
        return {"safe_pct": safe/total if total else 0.0, "safe_cells": safe, "flood_cells": flood, "area": total}

    start_desc = describe_zone(*start_px)
    # For simplicity, use first goal for zone description (or average them)
    goal_desc = describe_zone(*goal_list[0]) if goal_list else {"safe_pct": 0, "safe_cells": 0, "flood_cells": 0, "area": 0}

    # ---------------- AGENT 1: Flood Dynamics ----------------
    print("  Agent 1: Flood Dynamics -> predicting imminent risk")
    prompt1 = f"""
You are a hydrologist. Predict which currently SAFE cells will flood in the next 30–60 minutes.
Emergency zone: {json.dumps(start_desc)}
Base zones: {len(goal_list)} locations
Return a plain Python-style list of (x,y) pairs to penalize heavily (+80 cost).
If none, return [].
Example: [(512,340), (520,355), ...]
Also include one short sentence explanation at the end.
"""
    out1 = call_ollama("gpt-oss:120b-cloud", prompt1) or "[]"
    coords1 = parse_coords_from_text(out1, max_coords=5000)
    coords1 = safe_coord_list(coords1)
    applied1 = 0
    for x, y in coords1[:150]:
        if grid[y, x] == 1:
            cost_grid[y, x] += 80.0
            applied1 += 1
    reason1 = out1.strip()
    agent_infos.append({
        "name": "Agent 1",
        "role": "Flood Dynamics",
        "raw_output": reason1,
        "coords": coords1,
        "applied_count": applied1,
        "action": "penalize",
        "effect": "+80 cost (on safe cells)"
    })

    # ---------------- AGENT 2: Corridor Strategist ----------------
    print("  Agent 2: Corridor Strategist -> rewarding wide corridors")
    prompt2 = f"""
You are an evacuation route planner.
Given emergency zone: {json.dumps(start_desc)} and {len(goal_list)} base locations,
return a Python-style list of up to 300 (x,y) coordinates on SAFE land that you want to reward (lower cost by 0.5).
Also include one short sentence explaining why you picked them.
"""
    out2 = call_ollama("gpt-oss:120b-cloud", prompt2) or "[]"
    coords2 = parse_coords_from_text(out2, max_coords=5000)
    coords2 = safe_coord_list(coords2)
    applied2 = 0
    for x, y in coords2[:300]:
        if grid[y, x] == 1:
            cost_grid[y, x] = max(0.3, cost_grid[y, x] - 0.5)
            applied2 += 1
    reason2 = out2.strip()
    agent_infos.append({
        "name": "Agent 2",
        "role": "Corridor Strategist",
        "raw_output": reason2,
        "coords": coords2,
        "applied_count": applied2,
        "action": "reward",
        "effect": "-0.5 cost (min 0.3)"
    })

    # ---------------- AGENT 3: Human Behavior Expert ----------------
    print("  Agent 3: Human Behavior -> penalizing panic zones / choke points")
    prompt3 = f"""
You are a disaster psychologist.
Given emergency zone: {json.dumps(start_desc)} and {len(goal_list)} base locations,
return a Python-style list of (x,y) coordinates (up to 120) that are confusing, narrow or panic-prone which should get a penalty of +25 cost.
Also include a one-line explanation.
"""
    out3 = call_ollama("gpt-oss:120b-cloud", prompt3) or "[]"
    coords3 = parse_coords_from_text(out3, max_coords=5000)
    coords3 = safe_coord_list(coords3)
    applied3 = 0
    for x, y in coords3[:120]:
        if grid[y, x] == 1:
            cost_grid[y, x] += 25.0
            applied3 += 1
    reason3 = out3.strip()
    agent_infos.append({
        "name": "Agent 3",
        "role": "Human Behavior Expert",
        "raw_output": reason3,
        "coords": coords3,
        "applied_count": applied3,
        "action": "avoid",
        "effect": "+25 cost"
    })

    # ---------------- AGENT 4: Incident Commander ----------------
    print("  Agent 4: Incident Commander -> final directive")
    prompt4 = f"""
You are the Incident Commander. We have {len(goal_list)} possible base stations for evacuation.
Summarize in one short sentence the chosen approach for routing from emergency zone to bases.
Return only a single sentence explaining the strategy.
"""
    out4 = call_ollama("gpt-oss:120b-cloud", prompt4) or "No commander response."
    commander_text = out4.strip()
    agent_infos.append({
        "name": "Agent 4",
        "role": "Incident Commander",
        "raw_output": commander_text,
        "coords": [],
        "applied_count": 0,
        "action": "command",
        "effect": commander_text
    })

    return cost_grid, agent_infos

# --------------------- A* USING AI COST GRID ---------------------
def heuristic(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def astar_mas(start, goal, cost_grid):
    neighbors = [(0,1),(1,0),(0,-1),(-1,0),(1,1),(1,-1),(-1,1),(-1,-1)]
    open_set = []
    heapq.heappush(open_set, (heuristic(start, goal), 0, start))
    came_from = {}
    g_score = {start: 0}
    seen = set()

    while open_set:
        _, _, current = heapq.heappop(open_set)
        if current == goal:
            path = []
            total_cost = g_score[current]
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start)
            path.reverse()
            return path, total_cost

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
    return None, None

# --------------------- DETAILED AGENT REASONING EXPANSION ---------------------
def expand_agent_reasoning(ag, start, goals, paths, cost_grid, max_example_coords=6):
    """Generate detailed reasoning for each agent."""
    name = ag.get("name", "Agent")
    role = ag.get("role", "")
    raw = ag.get("raw_output", "").strip()
    action = ag.get("action", "n/a")
    applied = ag.get("applied_count", 0)
    effect = ag.get("effect", "")

    lines = []
    header = f"{name} ({role}) — action: {action}  effect: {effect}"
    lines.append(header)
    lines.append(f"It applied its logic to {applied} cell(s) (reported).")

    if raw:
        raw_preview = raw.splitlines()
        preview_line = raw_preview[0][:220] if raw_preview else ""
        lines.append("Agent raw summary: " + (preview_line if preview_line else "[no details]"))
        if len(raw_preview) > 1:
            lines.append("  " + raw_preview[1][:220])
    else:
        lines.append("Agent raw summary: [no raw text produced]")

    coords = ag.get("coords", []) or []
    if coords:
        sample_coords = coords[:max_example_coords]
        coords_text = ", ".join([f"({x},{y})" for x, y in sample_coords])
        lines.append(f"Example affected cells (truncated): {coords_text}")
    else:
        lines.append("No coordinate list produced by agent (or list empty).")

    # Calculate impact across all paths
    if paths and coords:
        coords_set = set(coords)
        total_hits = 0
        for path_info in paths:
            if path_info['path']:
                hits = sum(1 for p in path_info['path'] if p in coords_set)
                total_hits += hits
        lines.append(f"This agent's cells intersected {total_hits} path cell(s) across all routes.")
    else:
        lines.append("No paths to evaluate intersections.")

    if len(lines) < 4:
        lines.append("Additional inference: agent adjusted local costs to bias route selection.")

    return lines

# --------------------- VISUAL WINDOWS ---------------------
def show_mas_reasoning_window(agent_infos, start, goals, path_results, cost_grid):
    """Show textual reasoning window."""
    tstamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [f"MAS RUN: {tstamp}", f"Emergency: {start}   Bases: {goals}", ""]

    for ag in agent_infos:
        expanded = expand_agent_reasoning(ag, start, goals, path_results, cost_grid)
        lines.append("=" * 60)
        lines.append(f"{ag.get('name','Agent')}:")
        lines.extend(expanded)
        lines.append("")

    lines.append("=" * 60)
    lines.append("PATH RESULTS:")
    for i, pr in enumerate(path_results):
        if pr['path']:
            marker = "*** SHORTEST ***" if pr['is_shortest'] else ""
            lines.append(f"  Base {i+1} {pr['goal']}: {len(pr['path'])} steps, cost={pr['cost']:.1f} {marker}")
        else:
            lines.append(f"  Base {i+1} {pr['goal']}: NO PATH FOUND")

    small_text_window("MAS Reasoning (Multi-Base Analysis)", lines, size=(880, 980))

def show_agent_influence_overlay(agent_infos, path_results, emergency, bases):
    """Create visualization with all paths and overlays."""
    overlay = vis_base.copy()

    # Gather agent influence coordinates
    penalize_coords = []
    reward_coords   = []
    avoid_coords    = []
    for ag in agent_infos:
        if ag["action"] == "penalize":
            penalize_coords.extend(ag["coords"])
        elif ag["action"] == "reward":
            reward_coords.extend(ag["coords"])
        elif ag["action"] == "avoid":
            avoid_coords.extend(ag["coords"])

    penalize_coords = list({(x,y) for x,y in safe_coord_list(penalize_coords)})[:MAX_DRAW_CELLS]
    reward_coords   = list({(x,y) for x,y in safe_coord_list(reward_coords)})[:MAX_DRAW_CELLS]
    avoid_coords    = list({(x,y) for x,y in safe_coord_list(avoid_coords)})[:MAX_DRAW_CELLS]

    # Draw overlays
    img = overlay.copy()
    if penalize_coords:
        img = draw_overlay(img, penalize_coords, COLOR_PENALIZE, alpha=OVERLAY_ALPHA)
    if reward_coords:
        img = draw_overlay(img, reward_coords, COLOR_REWARD, alpha=OVERLAY_ALPHA)
    if avoid_coords:
        img = draw_overlay(img, avoid_coords, COLOR_AVOID, alpha=OVERLAY_ALPHA)

    # Draw all paths (alternative paths first, shortest last so it's on top)
    for pr in path_results:
        if pr['path'] and not pr['is_shortest']:
            for (px, py) in pr['path']:
                cv2.circle(img, (px, py), 2, COLOR_PATH_ALT, -1)
    
    # Draw shortest path on top
    for pr in path_results:
        if pr['path'] and pr['is_shortest']:
            for (px, py) in pr['path']:
                cv2.circle(img, (px, py), 3, COLOR_PATH_SHORTEST, -1)

    # Draw emergency and base markers
    cv2.circle(img, emergency, 18, COLOR_EMERGENCY, -1)
    cv2.putText(img, "E", (emergency[0] + 22, emergency[1] + 32), 
                cv2.FONT_HERSHEY_DUPLEX, 1.3, (255,255,255), 3)
    
    for i, base in enumerate(bases):
        cv2.circle(img, base, 14, COLOR_BASE, -1)
        cv2.putText(img, f"B{i+1}", (base[0] + 18, base[1] + 28), 
                    cv2.FONT_HERSHEY_DUPLEX, 0.9, (255,255,255), 2)

    # Legend
    h, w = img.shape[:2]
    panel_w = 400
    overlayp = img.copy()
    cv2.rectangle(overlayp, (w - panel_w - 12, 12), (w - 12, 280), (8,8,8), -1)
    cv2.addWeighted(overlayp, 0.6, img, 0.4, 0, img)
    ox = w - panel_w
    oy = 36
    
    cv2.putText(img, "Agent Influence + Multi-Base Paths", (ox + 6, oy), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (230,230,230), 2)
    oy += 28
    cv2.putText(img, "Penalized (Agent1)  -> red overlay", (ox + 8, oy), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, COLOR_PENALIZE, 1)
    oy += 20
    cv2.putText(img, "Rewarded (Agent2)   -> green overlay", (ox + 8, oy), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, COLOR_REWARD, 1)
    oy += 20
    cv2.putText(img, "Avoid (Agent3)      -> yellow overlay", (ox + 8, oy), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, COLOR_AVOID, 1)
    oy += 28
    cv2.putText(img, "SHORTEST Path       -> YELLOW dots", (ox + 8, oy), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, COLOR_PATH_SHORTEST, 2)
    oy += 22
    cv2.putText(img, "Alternative Paths   -> green dots", (ox + 8, oy), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, COLOR_PATH_ALT, 1)
    oy += 28
    cv2.putText(img, "E = Emergency  B1,B2... = Bases", (ox + 8, oy), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255,255,255), 1)

    cv2.imshow("Agent Influence Overlay (Multi-Base)", img)

# --------------------- MOUSE CALLBACK ---------------------
emergency_point = None
base_points = []
window_name = "AI Flood Evacuation Planner – Multi-Base MAS"
cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
cv2.resizeWindow(window_name, min(1200, W), min(800, H))

def draw_legend_on_image(img):
    """Draw legend on the image."""
    x = W - 420
    y = 15
    overlay = img.copy()
    cv2.rectangle(overlay, (x - 10, y), (W - 10, y + 205), (10, 10, 10), -1)
    cv2.addWeighted(overlay, 0.75, img, 0.25, 0, img)
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(img, "LEGEND", (x, y + 28), font, 0.8, (255, 255, 255), 2)
    items = [
        (y + 60,  "Flooded (Unsafe)",     COLOR_FLOOD),
        (y + 95,  "Safe Land",            COLOR_SAFE),
        (y + 130, "SHORTEST Path",        COLOR_PATH_SHORTEST),
        (y + 165, "Alternative Paths",    COLOR_PATH_ALT),
        (y + 200, "Emergency (E)",        COLOR_EMERGENCY),
    ]
    for py, text, color in items:
        cv2.rectangle(img, (x, py - 20), (x + 28, py), color, -1)
        cv2.putText(img, text, (x + 38, py - 2), font, 0.6, (255, 255, 255), 2)

def click_event(event, x, y, flags, param):
    global emergency_point, base_points, vis
    
    if event == cv2.EVENT_LBUTTONDOWN:
        if not (0 <= x < W and 0 <= y < H):
            return
        
        # Check if point is on safe land
        if grid[y, x] != 1:
            print(f"[UI] ERROR: Point ({x},{y}) is not on SAFE land. Please pick on safe land.")
            return
        
        # First click = emergency point
        if emergency_point is None:
            emergency_point = (x, y)
            vis = vis_base.copy()
            cv2.circle(vis, (x, y), 18, COLOR_EMERGENCY, -1)
            cv2.putText(vis, "E", (x + 22, y + 32), cv2.FONT_HERSHEY_DUPLEX, 1.3, (255,255,255), 3)
            print(f"[UI] Emergency point set: {x,y}")
            print("[UI] Now click to add base stations. Press SPACE when done.")
            tmp = vis.copy()
            draw_legend_on_image(tmp)
            cv2.imshow(window_name, tmp)
        
        # Subsequent clicks = base points
        else:
            base_points.append((x, y))
            cv2.circle(vis, (x, y), 14, COLOR_BASE, -1)
            cv2.putText(vis, f"B{len(base_points)}", (x + 18, y + 28), 
                        cv2.FONT_HERSHEY_DUPLEX, 0.9, (255,255,255), 2)
            print(f"[UI] Base {len(base_points)} added: {x,y}")
            tmp = vis.copy()
            draw_legend_on_image(tmp)
            cv2.imshow(window_name, tmp)

# --------------------- MAIN ---------------------
cv2.setMouseCallback(window_name, click_event)
tmp = vis_base.copy()
draw_legend_on_image(tmp)
cv2.imshow(window_name, tmp)

print("=" * 70)
print("MULTI-BASE FLOOD EVACUATION PLANNER")
print("=" * 70)
print("1. Click once to set EMERGENCY point (E) - where people are trapped")
print("2. Click multiple times to set BASE STATIONS (B1, B2, B3...)")
print("3. Press SPACE to compute all paths")
print("4. Press ESC to exit")
print("=" * 70)
print()
print("The SHORTEST path will be highlighted in YELLOW")
print("Alternative paths will be shown in GREEN")
print("=" * 70)

# Event loop
while True:
    key = cv2.waitKey(20) & 0xFF
    
    if key == 27:  # ESC
        break
    
    elif key == 32:  # SPACE - compute paths
        if emergency_point is None:
            print("[UI] Please set emergency point first (click on map)")
            continue
        
        if len(base_points) == 0:
            print("[UI] Please add at least one base station")
            continue
        
        print(f"\n[UI] Computing paths from emergency {emergency_point} to {len(base_points)} bases...")
        
        # Run MAS with all goals
        cost_grid, agent_infos = mas_refine_cost_grid(emergency_point, base_points)
        
        # Compute path to each base
        path_results = []
        for i, base in enumerate(base_points):
            print(f"  Computing path to Base {i+1} {base}...")
            path, cost = astar_mas(emergency_point, base, cost_grid)
            path_results.append({
                'goal': base,
                'path': path,
                'cost': cost if cost is not None else float('inf'),
                'is_shortest': False
            })
        
        # Find shortest path
        valid_paths = [pr for pr in path_results if pr['path'] is not None]
        if valid_paths:
            shortest = min(valid_paths, key=lambda x: x['cost'])
            shortest['is_shortest'] = True
            print(f"\n[MAS] SHORTEST path: to {shortest['goal']} with cost {shortest['cost']:.1f}")
        else:
            print("[MAS] NO SURVIVABLE ROUTES TO ANY BASE!")
        
        # Visualize
        vis_result = vis_base.copy()
        
        # Draw emergency marker
        cv2.circle(vis_result, emergency_point, 18, COLOR_EMERGENCY, -1)
        cv2.putText(vis_result, "E", (emergency_point[0] + 22, emergency_point[1] + 32), 
                    cv2.FONT_HERSHEY_DUPLEX, 1.3, (255,255,255), 3)
        
        # Draw base markers
        for i, base in enumerate(base_points):
            cv2.circle(vis_result, base, 14, COLOR_BASE, -1)
            cv2.putText(vis_result, f"B{i+1}", (base[0] + 18, base[1] + 28), 
                        cv2.FONT_HERSHEY_DUPLEX, 0.9, (255,255,255), 2)
        
        # Draw alternative paths first
        for pr in path_results:
            if pr['path'] and not pr['is_shortest']:
                for (px, py) in pr['path']:
                    cv2.circle(vis_result, (px, py), 3, COLOR_PATH_ALT, -1)
        
        # Draw shortest path on top
        for pr in path_results:
            if pr['path'] and pr['is_shortest']:
                for (px, py) in pr['path']:
                    cv2.circle(vis_result, (px, py), 4, COLOR_PATH_SHORTEST, -1)
        
        # Show influence overlay window
        show_agent_influence_overlay(agent_infos, path_results, emergency_point, base_points)
        
        # Show reasoning window
        show_mas_reasoning_window(agent_infos, emergency_point, base_points, path_results, cost_grid)
        
        # Update main window
        tmp = vis_result.copy()
        draw_legend_on_image(tmp)
        cv2.imshow(window_name, tmp)
        
        print("\n[UI] Results displayed. Click new points or press ESC to exit.")
        print("[UI] To start over: close windows and click new emergency point.")

cv2.destroyAllWindows()