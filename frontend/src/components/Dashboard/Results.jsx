import { useState, useRef, useEffect } from "react";
import Navbar from "./Navbar";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { MapPin, Navigation, RotateCcw, Info, List } from "lucide-react";

/* ---------------- API CALLS ---------------- */
async function getFloodPath(start, goals, imagePath) {
  const token = localStorage.getItem("token");

  const res = await fetch("/api/flood/path", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ 
        start, 
        goals, // Sending the array we collected
        imagePath 
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    try {
        const json = JSON.parse(text);
        throw new Error(json.message || json.error || `API Error: ${res.status}`);
    } catch (e) {
        throw new Error(`API ${res.status}: ${text}`);
    }
  }
  return res.json();
}

async function getLatestFloodImage() {
  const res = await fetch("/api/flood/latest-image");
  if (!res.ok) throw new Error(`Failed to fetch image`);
  return res.json();
}

/* ---------------- COMPONENT ---------------- */
export default function Results() {
  const [startPoint, setStartPoint] = useState(null);
  const [goalPoints, setGoalPoints] = useState([]); // Array for multiple bases
  const [isMultiMode, setIsMultiMode] = useState(false); // Toggle state
  
  const [imgB64, setImgB64] = useState(null);
  const [agents, setAgents] = useState([]);
  const [reasoningText, setReasoningText] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [legend, setLegend] = useState({});
  const [loading, setLoading] = useState(false);

  const [baseImageUrl, setBaseImageUrl] = useState("/sample.jpg");
  const [currentMapFile, setCurrentMapFile] = useState(null);
  const [loadingBaseImg, setLoadingBaseImg] = useState(true);

  const imgRef = useRef(null);

  useEffect(() => {
    async function loadBaseImage() {
      try {
        setLoadingBaseImg(true);
        const data = await getLatestFloodImage();
        if (data.imageUrl) {
          setBaseImageUrl(data.imageUrl);
          setCurrentMapFile(data.filename || data.imageUrl.split('/').pop()); 
        }
      } catch (err) {
        toast.error("Could not load latest flood image");
      } finally {
        setLoadingBaseImg(false);
      }
    }
    loadBaseImage();
  }, []);

  const handleImageClick = (e) => {
    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    let x = Math.round((e.clientX - rect.left) * scaleX);
    let y = Math.round((e.clientY - rect.top) * scaleY);
    x = Math.max(0, Math.min(img.naturalWidth - 1, x));
    y = Math.max(0, Math.min(img.naturalHeight - 1, y));

    if (!startPoint) {
      setStartPoint([x, y]);
      toast.success("Start point (A) set");
    } else {
      if (isMultiMode) {
        setGoalPoints((prev) => [...prev, [x, y]]);
        toast.success(`Base ${goalPoints.length + 1} added`);
      } else {
        setGoalPoints([[x, y]]);
        toast.success("Goal point (B) set");
      }
    }
  };

  const handleCompute = async () => {
    if (!startPoint || goalPoints.length === 0) {
      toast.error("Select start and at least one goal");
      return;
    }

    try {
      setLoading(true);
      const data = await getFloodPath(startPoint, goalPoints, currentMapFile);
      if (data.ok === false) throw new Error(data.message || "Backend error");

      setImgB64(data.image);
      setAgents(data.agents || []);
      setReasoningText(data.reasoning_text || "");
      setConclusion(data.conclusion || "");
      setLegend(data.legend || {});
      toast.success("Multi-path analysis complete!");
    } catch (err) {
      toast.error(err.message || "Failed to compute path");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStartPoint(null);
    setGoalPoints([]);
    setImgB64(null);
    setAgents([]);
    setReasoningText("");
    setConclusion("");
    setLegend({});
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#050816] text-slate-100 px-6 py-6 box-border">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
          
          {/* LEFT: Map Interaction Area */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Rescue Route Planner</h2>
              
              {/* TOGGLE SWITCH */}
              <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-800">
                <span className={`text-xs font-bold ${!isMultiMode ? 'text-emerald-400' : 'text-slate-500'}`}>Single</span>
                <button 
                  onClick={() => { setIsMultiMode(!isMultiMode); handleReset(); }}
                  className={`w-12 h-6 rounded-full relative transition-colors ${isMultiMode ? 'bg-emerald-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isMultiMode ? 'left-7' : 'left-1'}`} />
                </button>
                <span className={`text-xs font-bold ${isMultiMode ? 'text-emerald-400' : 'text-slate-500'}`}>Multi-Base</span>
              </div>
            </div>

            <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
              {loadingBaseImg ? (
                <div className="h-[500px] flex items-center justify-center animate-pulse text-slate-500">Loading Map...</div>
              ) : (
                <div className="relative">
                  <img
                    ref={imgRef}
                    src={imgB64 ? `data:image/png;base64,${imgB64}` : baseImageUrl}
                    alt="Flood map"
                    onClick={handleImageClick}
                    className="block w-full max-h-[70vh] object-contain cursor-crosshair"
                  />
                  
                  {/* Markers (Only show if no result image yet) */}
                  {!imgB64 && (
                    <>
                      {startPoint && (
                        <div className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-[0_0_10px_red] animate-bounce"
                          style={{ left: `${(startPoint[0] / imgRef.current?.naturalWidth) * 100}%`, top: `${(startPoint[1] / imgRef.current?.naturalHeight) * 100}%`, transform: 'translate(-50%, -100%)' }}
                        />
                      )}
                      {goalPoints.map((gp, i) => (
                        <div key={i} className="absolute w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_10px_lime]"
                          style={{ left: `${(gp[0] / imgRef.current?.naturalWidth) * 100}%`, top: `${(gp[1] / imgRef.current?.naturalHeight) * 100}%`, transform: 'translate(-50%, -50%)' }}
                        >
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-black px-1 rounded">B{i+1}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button onClick={handleCompute} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg">
                <Navigation size={20} /> {loading ? "Computing Paths..." : "Analyze Routes"}
              </button>
              <button onClick={handleReset} className="px-6 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-slate-300">
                <RotateCcw size={20} />
              </button>
            </div>
          </div>

          {/* RIGHT: Stats & AI Reasoning */}
          <div className="w-full lg:w-96 space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                <Info size={16}/> AI Commander Insights
              </h3>
              {conclusion ? (
                <p className="text-emerald-400 text-sm font-medium mb-4 leading-relaxed">{conclusion}</p>
              ) : (
                <p className="text-slate-500 text-sm italic">Set your points on the map to begin rescue simulation.</p>
              )}
              
              <div className="space-y-3">
                {agents.map((ag, i) => (
                  <div key={i} className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-xs font-bold text-emerald-500">{ag.name} ({ag.role})</p>
                    <p className="text-[11px] text-slate-400 mt-1">{ag.effect}</p>
                  </div>
                ))}
              </div>
            </div>

            {reasoningText && (
              <div className="bg-black/40 border border-slate-800 rounded-2xl p-4 font-mono text-[10px] text-slate-500 overflow-y-auto max-h-48 whitespace-pre-wrap">
                {reasoningText}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}