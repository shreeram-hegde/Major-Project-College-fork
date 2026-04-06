# Final_pather.py
# Refactored with Smart Fallback for Multi-Path server use

import cv2
import numpy as np
import heapq
import json
import re
from datetime import datetime
import requests

# Colors (BGR)
COLOR_FLOOD = (0, 0, 150)
COLOR_SAFE = (50, 100, 50)
COLOR_PATH_ALT = (0, 255, 0)         
COLOR_PATH_SHORTEST = (0, 255, 255)  
COLOR_EMERGENCY = (0, 0, 255)        
COLOR_BASE = (255, 0, 255)           

MAX_DRAW_CELLS = 3000
OVERLAY_ALPHA = 0.45

coord_re = re.compile(r"\(?\s*(-?\d+)\s*,\s*(-?\d+)\s*\)?")

# --------------------- OLLAMA STATUS & COMMUNICATION ---------------------
def is_ollama_online():
    """Quick 1-second ping to see if Ollama is running on the machine."""
    try:
        requests.get("http://localhost:11434/", timeout=1)
        return True
    except requests.exceptions.RequestException:
        return False

def call_ollama(model, prompt, temperature=0.3):
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "temperature": temperature,
        "stream": False
    }
    try:
        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()
        return response.json().get("response", "[]")
    except requests.exceptions.RequestException as e:
        return "[]"

# --------------------- HELPERS ---------------------
def parse_coords_from_text(text, max_coords=5000):
    if not text: return []
    coords = []
    for m in coord_re.findall(text):
        try:
            coords.append((int(m[0]), int(m[1])))
            if len(coords) >= max_coords: break
        except: continue
    return coords

def safe_coord_list(coords, W, H):
    return [(x, y) for x, y in coords if 0 <= x < W and 0 <= y < H]

# --------------------- MAS REFINEMENT (WITH FALLBACK) ---------------------
def mas_refine_cost_grid(start_px, goals_px, grid):
    H, W = grid.shape
    tstamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Base Cost Setup (1 = Safe, 99999 = Flooded)
    cost_grid = np.ones((H, W), dtype=np.float32) * 999.0
    cost_grid[grid == 1] = 1.0
    cost_grid[grid == 0] = 99999.0

    agent_infos = []

    # --- SMART FALLBACK CHECK ---
    if not is_ollama_online():
        print(f"\n[SYSTEM] Ollama offline @ {tstamp}. Using standard A* routing.")
        agent_infos.append({
            "name": "System Fallback", 
            "role": "Offline Mode Active", 
            "raw_output": "AI Engine (Ollama) is not running on the host machine. The system has automatically fallen back to standard terrain-based A* pathfinding.", 
            "coords": [], 
            "applied_count": 0, 
            "action": "bypass", 
            "effect": "Standard shortest-path routing enabled. Flood avoidance active."
        })
        return cost_grid, agent_infos

    # --- FULL AI MAS MODE ---
    print(f"\n[M A S] RUN @ {tstamp} -- Emergency {start_px} Bases {goals_px}")

    def describe_zone(x, y, r=40):
        y0, y1 = max(0, y - r), min(H, y + r)
        x0, x1 = max(0, x - r), min(W, x + r)
        zone = grid[y0:y1, x0:x1]
        safe = int(np.sum(zone == 1))
        total = zone.size
        return {
            "safe_pct": safe / total if total else 0.0,
            "safe_cells": safe,
            "flood_cells": total - safe,
        }

    start_desc = describe_zone(*start_px)

    # Agent 1: Flood Dynamics
    prompt1 = f"""You are a hydrologist. Predict currently SAFE cells to flood next.
Emergency zone: {json.dumps(start_desc)}
Base zones: {len(goals_px)} locations
Return plain list of (x,y) pairs to penalize (+80 cost). If none, return []."""
    out1 = call_ollama("gpt-oss:120b-cloud", prompt1) or "[]"
    coords1 = safe_coord_list(parse_coords_from_text(out1), W, H)
    applied1 = 0
    for x, y in coords1[:150]:
        if grid[y, x] == 1:
            cost_grid[y, x] += 80.0
            applied1 += 1
    agent_infos.append({"name": "Agent 1", "role": "Flood Dynamics", "raw_output": out1.strip(), "coords": coords1, "applied_count": applied1, "action": "penalize", "effect": "+80 risk cost applied"})

    # Agent 2: Corridor Strategist
    prompt2 = f"""You are an evacuation route planner. Given emergency zone: {json.dumps(start_desc)} and {len(goals_px)} bases,
return list of up to 300 (x,y) on SAFE land to reward (-0.5 cost)."""
    out2 = call_ollama("gpt-oss:120b-cloud", prompt2) or "[]"
    coords2 = safe_coord_list(parse_coords_from_text(out2), W, H)
    applied2 = 0
    for x, y in coords2[:300]:
        if grid[y, x] == 1:
            cost_grid[y, x] = max(0.3, cost_grid[y, x] - 0.5)
            applied2 += 1
    agent_infos.append({"name": "Agent 2", "role": "Corridor Strategist", "raw_output": out2.strip(), "coords": coords2, "applied_count": applied2, "action": "reward", "effect": "Path resistance lowered"})

    # Agent 3: Human Behavior
    prompt3 = f"""You are a disaster psychologist. Given emergency zone: {json.dumps(start_desc)} and {len(goals_px)} bases,
return list of (x,y) up to 120 coords that are confusing/panic-prone to penalize (+25 cost)."""
    out3 = call_ollama("gpt-oss:120b-cloud", prompt3) or "[]"
    coords3 = safe_coord_list(parse_coords_from_text(out3), W, H)
    applied3 = 0
    for x, y in coords3[:120]:
        if grid[y, x] == 1:
            cost_grid[y, x] += 25.0
            applied3 += 1
    agent_infos.append({"name": "Agent 3", "role": "Human Behavior", "raw_output": out3.strip(), "coords": coords3, "applied_count": applied3, "action": "avoid", "effect": "+25 panic cost applied"})

    # Agent 4: Incident Commander
    prompt4 = f"You are the Incident Commander. We have {len(goals_px)} bases. Summarize approach in one short sentence."
    out4 = call_ollama("gpt-oss:120b-cloud", prompt4) or "No commander response."
    agent_infos.append({"name": "Agent 4", "role": "Commander", "raw_output": out4.strip(), "coords": [], "applied_count": 0, "action": "command", "effect": out4.strip()})

    return cost_grid, agent_infos

# --------------------- A* PATHFINDING ---------------------
def heuristic(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def astar_mas(start, goal, cost_grid, grid):
    H, W = grid.shape
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

        if current in seen: continue
        seen.add(current)

        for dx, dy in neighbors:
            nx, ny = current[0] + dx, current[1] + dy
            if not (0 <= nx < W and 0 <= ny < H): continue
            if grid[ny, nx] != 1: continue
            if cost_grid[ny, nx] >= 9999: continue
            
            step_cost = cost_grid[ny, nx] * (1.414 if dx and dy else 1.0)
            tent_g = g_score[current] + step_cost
            neighbor = (nx, ny)
            if neighbor not in g_score or tent_g < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tent_g
                f = tent_g + heuristic(neighbor, goal)
                heapq.heappush(open_set, (f, tent_g, neighbor))
    return None, None

# --------------------- TEXT SUMMARY ---------------------
def build_mas_text_summary(agent_infos, start, path_results):
    lines = [f"Emergency Start: {start}", f"Bases Evaluated: {len(path_results)}", ""]
    
    lines.append("--- ROUTE ANALYSIS ---")
    for i, pr in enumerate(path_results):
        if pr['path']:
            marker = " (*** SHORTEST ***)" if pr['is_shortest'] else ""
            lines.append(f"Base {i+1} at {pr['goal']}: {len(pr['path'])} steps, cost={pr['cost']:.1f}{marker}")
        else:
            lines.append(f"Base {i+1} at {pr['goal']}: NO SURVIVABLE PATH")
    lines.append("")

    lines.append("--- AGENT INFLUENCE ---")
    for ag in agent_infos:
        lines.append(f"{ag.get('name')} ({ag.get('role')}): {ag.get('effect')}")
        if ag.get("raw_output"):
            lines.append(f"  > {ag.get('raw_output').splitlines()[0][:150]}...")
    
    return "\n".join(lines)

# --------------------- PUBLIC ENTRY POINT ---------------------
def compute_path(start_px, goals_px, grid_npy_path, original_image_path):
    grid = np.load(grid_npy_path)
    H, W = grid.shape

    vis_base = np.zeros((H, W, 3), dtype=np.uint8)
    vis_base[grid == 0] = COLOR_FLOOD
    vis_base[grid == 1] = COLOR_SAFE

    bg_img = cv2.imread(original_image_path)
    if bg_img is not None and bg_img.shape[:2] == (H, W):
        vis_base = cv2.addWeighted(bg_img, 0.6, vis_base, 0.4, 0)

    # 1. Cost grid + agents (Includes Smart Fallback Check)
    cost_grid, agent_infos = mas_refine_cost_grid(start_px, goals_px, grid)

   # 2. Compute path for EACH base
    path_results = []
    for base in goals_px:
        path, cost = astar_mas(start_px, base, cost_grid, grid)
        path_results.append({
            "goal": base,
            "path": path,
            "cost": float(cost) if cost is not None else float('inf'), # <--- FIXED HERE
            "is_shortest": False
        })

    # 3. Identify Shortest
    valid_paths = [pr for pr in path_results if pr['path'] is not None]
    if valid_paths:
        shortest = min(valid_paths, key=lambda x: x['cost'])
        shortest['is_shortest'] = True

    # 4. Draw Paths on Image
    vis_result = vis_base.copy()
    
    for pr in path_results:
        if pr['path'] and not pr['is_shortest']:
            for (px, py) in pr['path']:
                cv2.circle(vis_result, (px, py), 2, COLOR_PATH_ALT, -1)
                
    for pr in path_results:
        if pr['path'] and pr['is_shortest']:
            for (px, py) in pr['path']:
                cv2.circle(vis_result, (px, py), 4, COLOR_PATH_SHORTEST, -1)

    cv2.circle(vis_result, start_px, 14, COLOR_EMERGENCY, -1)
    for i, base in enumerate(goals_px):
        cv2.circle(vis_result, base, 12, COLOR_BASE, -1)

    reasoning_text = build_mas_text_summary(agent_infos, start_px, path_results)
    
    if valid_paths:
        conclusion = f"Found {len(valid_paths)} safe routes. The shortest path routes to Base {shortest['goal']}."
    else:
        conclusion = "No survivable routes found to any base."

    return {
        "paths": path_results,
        "agents": agent_infos,
        "image": vis_result,
        "reasoning_text": reasoning_text,
        "conclusion": conclusion
    }