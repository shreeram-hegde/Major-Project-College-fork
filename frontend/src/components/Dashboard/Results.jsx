import { useState, useRef } from "react";
import Navbar from "./Navbar";

async function getFloodPath(start, goal) {
  const res = await fetch("/api/flood/path", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start, goal }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json(); // { path, agents, image, reasoning_text, conclusion }
}

export default function Results() {
  const [a, setA] = useState(null); // [x, y]
  const [b, setB] = useState(null); // [x, y]
  const [imgB64, setImgB64] = useState(null); // ML output image
  const [agents, setAgents] = useState([]); // MAS agent info
  const [reasoningText, setReasoningText] = useState(""); // full MAS reasoning
  const [conclusion, setConclusion] = useState(""); // one-line summary
  const imgRef = useRef(null);

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
      // if both already set, start over with new A
      setA([x, y]);
      setB(null);
      setImgB64(null);
      setAgents([]);
      setReasoningText("");
      setConclusion("");
    }
  };

  const handleCompute = async () => {
    if (!a || !b) {
      alert("Click to set A then B on the image first.");
      return;
    }
    try {
      const data = await getFloodPath(a, b);
      setImgB64(data.image);
      setAgents(data.agents || []);
      setReasoningText(data.reasoning_text || "");
      setConclusion(data.conclusion || "");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleReset = () => {
    setA(null);
    setB(null);
    setImgB64(null);
    setAgents([]);
    setReasoningText("");
    setConclusion("");
  };

  return (
    <>
    <Navbar />
      <div className="min-h-screen bg-[#050816] text-slate-100 px-6 py-6 box-border">
        <h2 className="text-2xl font-semibold mb-4">
          Flood Evacuation Planner
        </h2>

        <div className="flex flex-wrap gap-6 items-start">
          {/* LEFT: map + controls + output image */}
          <div className="flex-1 min-w-[300px] bg-slate-950/80 rounded-xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.4)]">
            <h3 className="text-lg font-medium mb-2">
              1. Pick start (A) and goal (B)
            </h3>
            <p className="text-sm text-slate-400 mb-3">
              Click once on the map to set point A, then click again to set
              point B. Press “Compute Path” to generate the safest route.
            </p>

            <div className="relative rounded-lg overflow-hidden border border-slate-800">
              <img
                ref={imgRef}
                src="/sample.jpg" // ensure sample.jpg is in frontend/public
                alt="Flood map"
                onClick={handleImageClick}
                className="block max-w-full h-auto cursor-crosshair"
              />

              {/* A/B badges */}
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

            {/* legend */}
            <div className="mt-3 inline-block bg-slate-900/80 px-4 py-2 rounded-md text-xs text-slate-100">
              <div className="font-semibold mb-1">Legend</div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-3 bg-red-600" />
                <span>Flooded (Unsafe)</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-4 h-3 bg-[#32643b]" />
                <span>Safe Land</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-4 h-3 bg-lime-400" />
                <span>AI Safe Path</span>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleCompute}
                className="px-4 py-2 rounded-full border-none bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-semibold cursor-pointer hover:from-emerald-400 hover:to-emerald-600 transition"
              >
                Compute Path
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-full border border-slate-600 bg-transparent text-slate-100 cursor-pointer hover:bg-slate-800/60 transition"
              >
                Reset
              </button>
            </div>

            {imgB64 && (
              <div className="mt-4">
                <h3 className="text-base font-medium mb-2">
                  2. AI path result
                </h3>
                <div className="rounded-lg overflow-hidden border border-slate-800">
                  <img
                    src={`data:image/png;base64,${imgB64}`}
                    alt="Computed path"
                    className="block max-w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: agent reasoning + conclusion + full reasoning text */}
          <div className="flex-none w-full md:w-80 max-h-[600px] overflow-y-auto bg-slate-950/80 rounded-xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.4)]">
            <h3 className="text-lg font-medium mb-2">3. Agent reasoning</h3>
            <p className="text-sm text-slate-400 mb-3">
              See how each agent influenced the route: penalties, rewards, and
              the final directive.
            </p>

            {agents.length === 0 && (
              <div className="text-sm text-slate-500 border border-dashed border-slate-700 rounded-lg px-3 py-2">
                Run a path first to see detailed explanations.
              </div>
            )}

            {agents.map((ag, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-800 p-3 mb-2 bg-slate-950"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{ag.name}</div>
                    <div className="text-xs text-slate-400">{ag.role}</div>
                  </div>
                  <span
                    className={[
                      "text-[0.7rem] px-2 py-0.5 rounded-full",
                      ag.action === "reward"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : ag.action === "penalize"
                          ? "bg-red-400/10 text-red-300"
                          : "bg-amber-400/10 text-amber-300",
                    ].join(" ")}
                  >
                    {ag.action}
                  </span>
                </div>

                <div className="text-xs mt-1">
                  <span className="font-semibold">Effect:</span> {ag.effect}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Applied cells: {ag.applied_count}
                </div>

                {ag.raw_output && (
                  <div className="text-[0.7rem] text-slate-400 mt-1 border-t border-slate-900 pt-1">
                    {ag.raw_output.split("\n")[0]}
                  </div>
                )}
              </div>
            ))}

            {conclusion && (
              <div className="mt-3 text-sm text-emerald-300 border-t border-slate-800 pt-2">
                <span className="font-semibold">Conclusion: </span>
                {conclusion}
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
