import { useState, useRef, useEffect } from "react";
import Navbar from "./Navbar";
import toast from "react-hot-toast";

/* ---------------- API CALLS ---------------- */
async function getFloodPath(start, goal) {
  const token = localStorage.getItem("token");

  const res = await fetch("/api/flood/path", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ start, goal }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json(); // { ok, image, agents, reasoning_text, conclusion, legend, ... }
}

async function getLatestFloodImage() {
  const res = await fetch("/api/flood/latest-image", {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json(); // { imageUrl: "/data/your-latest-image.jpg" }
}

/* ---------------- COMPONENT ---------------- */
export default function Results() {
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);
  const [imgB64, setImgB64] = useState(null);
  const [agents, setAgents] = useState([]);
  const [reasoningText, setReasoningText] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [legend, setLegend] = useState({});
  const [loading, setLoading] = useState(false);

  const [baseImageUrl, setBaseImageUrl] = useState("/sample.jpg");
  const [loadingBaseImg, setLoadingBaseImg] = useState(true);

  const imgRef = useRef(null);

  /* ---------------- LOAD LATEST MAP IMAGE ---------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadBaseImage() {
      try {
        setLoadingBaseImg(true);
        const data = await getLatestFloodImage();
        if (cancelled) return;
        if (data.imageUrl) {
          setBaseImageUrl(data.imageUrl);
        } else {
          setBaseImageUrl("/sample.jpg");
        }
      } catch (err) {
        console.error(err);
        toast.error("Could not load latest flood image, using sample.jpg");
        setBaseImageUrl("/sample.jpg");
      } finally {
        if (!cancelled) setLoadingBaseImg(false);
      }
    }

    loadBaseImage();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- IMAGE CLICK ---------------- */
  const handleImageClick = (e) => {
    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    let x = Math.round((e.clientX - rect.left) * scaleX);
    let y = Math.round((e.clientY - rect.top) * scaleY);

    // Clamp to valid pixel range
    x = Math.max(0, Math.min(img.naturalWidth - 1, x));
    y = Math.max(0, Math.min(img.naturalHeight - 1, y));

    if (!a) {
      setA([x, y]);
    } else if (!b) {
      setB([x, y]);
    } else {
      // third click resets B and previous path
      setA([x, y]);
      setB(null);
      setImgB64(null);
      setAgents([]);
      setReasoningText("");
      setConclusion("");
      setLegend({});
    }
  };

  /* ---------------- COMPUTE ---------------- */
  const handleCompute = async () => {
    if (!a || !b) {
      toast.error("Select start (A) and end (B) first");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      const data = await getFloodPath(a, b);

      if (data.ok === false) {
        throw new Error(data.message || "Backend error");
      }

      setImgB64(data.image);
      setAgents(data.agents || []);
      setReasoningText(data.reasoning_text || "");
      setConclusion(data.conclusion || "");
      setLegend(data.legend || {});
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to compute path");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- RESET ---------------- */
  const handleReset = () => {
    setA(null);
    setB(null);
    setImgB64(null);
    setAgents([]);
    setReasoningText("");
    setConclusion("");
    setLegend({});
    setLoading(false);
  };

  // Selection image: always raw latest map
  const selectionSrc = baseImageUrl;
  // Result image: AI path (if available)
  const resultSrc = imgB64 ? `data:image/png;base64,${imgB64}` : null;

  /* ---------------- UI ---------------- */
  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-[#050816] text-slate-100 px-6 py-6 box-border">
        <h2 className="text-2xl font-semibold mb-4">Flood Evacuation Planner</h2>

        <div className="flex flex-wrap gap-6 items-start">
          {/* LEFT */}
          <div className="flex-1 min-w-[300px] bg-slate-950/80 rounded-xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.4)]">
            <h3 className="text-lg font-medium mb-2">
              1. Pick start (A) and goal (B)
            </h3>

            <div className="relative rounded-lg overflow-hidden border border-slate-800">
              {loadingBaseImg ? (
                <div className="flex items-center justify-center h-[260px] text-sm text-slate-400">
                  Loading latest flood image...
                </div>
              ) : (
                <div className="w-full">
                  <img
                    ref={imgRef}
                    src={selectionSrc}
                    alt="Flood map"
                    onClick={handleImageClick}
                    className="block w-full max-h-[480px] object-contain cursor-crosshair"
                  />
                </div>
              )}

              <div className="absolute top-2 left-2 bg-slate-900/80 px-3 py-1 rounded-full text-xs">
                <span className="mr-3">
                  A:{" "}
                  {a ? (
                    <span className="text-emerald-400">
                      {a[0]}, {a[1]}
                    </span>
                  ) : (
                    <span className="text-slate-500">not set</span>
                  )}
                </span>
                <span>
                  B:{" "}
                  {b ? (
                    <span className="text-orange-400">
                      {b[0]}, {b[1]}
                    </span>
                  ) : (
                    <span className="text-slate-500">not set</span>
                  )}
                </span>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                disabled={loading}
                onClick={handleCompute}
                className={`px-4 py-2 rounded-full font-semibold transition
                ${
                  loading
                    ? "bg-slate-600 cursor-not-allowed"
                    : "bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-600 text-white"
                }`}
              >
                {loading ? "Computing..." : "Compute Path"}
              </button>

              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-full border border-slate-600 bg-transparent hover:bg-slate-800/60 transition"
              >
                Reset
              </button>
            </div>

            {resultSrc && (
              <div className="mt-4">
                <h3 className="text-base font-medium mb-2">
                  2. AI path result
                </h3>
                <img
                  src={resultSrc}
                  className="rounded-lg border border-slate-800 max-w-full"
                  alt="AI path"
                />
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="flex-none w-full md:w-80 max-h-[600px] overflow-y-auto bg-slate-950/80 rounded-xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.4)]">
            <h3 className="text-lg font-medium mb-2">3. Agent reasoning</h3>

            {agents.length === 0 && (
              <div className="text-sm text-slate-500 border border-dashed border-slate-700 rounded-lg px-3 py-2">
                Run a path first to see explanations.
              </div>
            )}

            {agents.map((ag, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-800 p-3 mb-2 bg-slate-950"
              >
                <div className="font-semibold">{ag.name}</div>
                <div className="text-xs text-slate-400">{ag.role}</div>
                <div className="text-xs mt-1">
                  <b>Effect:</b> {ag.effect}
                </div>
              </div>
            ))}

            {conclusion && (
              <div className="mt-3 text-sm text-emerald-300 border-t border-slate-800 pt-2">
                <b>Conclusion:</b> {conclusion}
              </div>
            )}

            {reasoningText && (
              <div className="mt-3 text-xs text-slate-400 whitespace-pre-wrap border-t border-slate-800 pt-2">
                {reasoningText}
              </div>
            )}

            {/* Legend */}
            {legend && Object.keys(legend).length > 0 && (
              <div className="mt-4 text-xs border-t border-slate-800 pt-3">
                <div className="font-semibold mb-2">Legend</div>
                <ul className="space-y-1">
                  {legend.safe_zone && (
                    <li className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-sm bg-[rgb(50,100,50)]" />
                      <span>{legend.safe_zone.label}</span>
                    </li>
                  )}
                  {legend.flood_zone && (
                    <li className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-sm bg-[rgb(0,0,150)]" />
                      <span>{legend.flood_zone.label}</span>
                    </li>
                  )}
                  {legend.path && (
                    <li className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-sm bg-[rgb(0,255,0)]" />
                      <span>{legend.path.label}</span>
                    </li>
                  )}
                  {legend.start && (
                    <li className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-[rgb(0,255,255)]" />
                      <span>{legend.start.label}</span>
                    </li>
                  )}
                  {legend.goal && (
                    <li className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-[rgb(203,192,255)]" />
                      <span>{legend.goal.label}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
