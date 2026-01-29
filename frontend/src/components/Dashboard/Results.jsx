import { useState, useRef } from "react";
import Navbar from "./Navbar";
import toast from "react-hot-toast";

/* ---------------- API CALL (PURE FUNCTION) ---------------- */
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

  return res.json();
}

/* ---------------- COMPONENT ---------------- */
export default function Results() {
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);
  const [imgB64, setImgB64] = useState(null);
  const [agents, setAgents] = useState([]);
  const [reasoningText, setReasoningText] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [loading, setLoading] = useState(false);

  const imgRef = useRef(null);

  /* ---------------- IMAGE CLICK ---------------- */
  const handleImageClick = (e) => {
    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    if (!a) {
      setA([x, y]);
    } else if (!b) {
      setB([x, y]);
    } else {
      setA([x, y]);
      setB(null);
      setImgB64(null);
      setAgents([]);
      setReasoningText("");
      setConclusion("");
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

      setImgB64(data.image);
      setAgents(data.agents || []);
      setReasoningText(data.reasoning_text || "");
      setConclusion(data.conclusion || "");
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
    setLoading(false);
  };

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
              <img
                ref={imgRef}
                src="/sample.jpg"
                alt="Flood map"
                onClick={handleImageClick}
                className="block max-w-full h-auto cursor-crosshair"
              />

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

            {imgB64 && (
              <div className="mt-4">
                <h3 className="text-base font-medium mb-2">
                  2. AI path result
                </h3>
                <img
                  src={`data:image/png;base64,${imgB64}`}
                  className="rounded-lg border border-slate-800"
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
          </div>
        </div>
      </div>
    </>
  );
}
