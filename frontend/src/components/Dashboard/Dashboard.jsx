// Dashboard.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { Upload } from "lucide-react";

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) {
      setFile(null);
      setPreviewUrl("");
      setError("");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setError("");
    setSuccessMsg("");
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please choose an image first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMsg("");

      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/upload/flood-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error === "invalid_image") {
          throw new Error(
            data.message ||
              "Invalid Image! Upload image of a geographical location's map"
          );
        }
        throw new Error(data.message || "Upload failed. Please try again.");
      }

      setSuccessMsg("Image uploaded and processed successfully.");
      setTimeout(() => {
        navigate("/dashboard/results");
      }, 600);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-[#050816] text-slate-100 px-4 md:px-8 py-8 box-border">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold">
              Flood Map Upload
            </h1>
            <p className="mt-2 text-sm md:text-base text-slate-300">
              Upload a satellite / geographical map image to generate a safe
              evacuation path using our AI planner.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-xs md:text-sm text-yellow-100">
            <p className="font-semibold mb-1">Important disclaimer</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Upload only images of geographical locations: satellite maps,
                flood maps, or terrain imagery.
              </li>
              <li>
                Do <span className="font-semibold">not</span> upload personal
                photos, selfies, cars, documents, or any non‑map images. These
                will be rejected by the system.
              </li>
              <li>
                Supported formats: JPG, JPEG, PNG. Use clear, reasonably
                high‑resolution images for best results.
              </li>
            </ul>
          </div>

          {/* Upload card */}
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 shadow-[0_10px_25px_rgba(0,0,0,0.45)] p-4 md:p-6 flex flex-col md:flex-row gap-6">
            {/* Left: picker + preview */}
            <div className="flex-1 flex flex-col items-center md:items-start gap-3">
              <label className="w-full max-w-sm aspect-[4/3] border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center hover:border-emerald-500 hover:bg-slate-900/40 transition cursor-pointer overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Selected"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <Upload size={40} className="text-slate-400 mb-2" />
                    <span className="text-xs md:text-sm text-slate-400">
                      Click to choose map image
                    </span>
                    <span className="mt-1 text-[11px] text-slate-500 text-center px-4">
                      Recommended: satellite view of flood‑prone region
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleUpload}
                disabled={loading || !file}
                className="w-full max-w-sm mt-2 px-4 py-2 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-semibold text-sm md:text-base disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Uploading & preparing..." : "Upload & analyze map"}
              </button>
            </div>

            {/* Right: short explanation */}
            <div className="flex-1 text-xs md:text-sm text-slate-300 space-y-3">
              <div>
                <p className="font-semibold text-slate-100">
                  What happens after upload?
                </p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>
                    The image is analyzed to detect flooded vs safe regions.
                  </li>
                  <li>
                    An AI planner computes the safest path between your chosen
                    start and goal points.
                  </li>
                  <li>
                    You’ll be redirected to the{" "}
                    <span className="font-semibold">Results</span> page to pick
                    points A/B and see the recommended route.
                  </li>
                </ul>
              </div>
              <div className="border-t border-slate-800 pt-3">
                <p className="font-semibold text-slate-100 mb-1">
                  Data & privacy
                </p>
                <p className="text-slate-400">
                  Uploaded images are used only to generate evacuation paths for
                  this session. Avoid uploading any sensitive or personal
                  imagery.
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="mt-4 space-y-2">
            {error && (
              <div className="rounded-lg bg-red-500/10 text-red-200 border border-red-600/60 px-4 py-2 text-xs md:text-sm">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="rounded-lg bg-emerald-500/10 text-emerald-200 border border-emerald-500/60 px-4 py-2 text-xs md:text-sm">
                {successMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
