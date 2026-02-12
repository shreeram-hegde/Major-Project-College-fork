import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, CheckCircle, AlertTriangle, Layers } from "lucide-react";

const HelpPage = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [availableMaps, setAvailableMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [loadingImg, setLoadingImg] = useState(true);
  
  const [details, setDetails] = useState({
    name: "",
    peopleCount: 1,
    injuries: "",
    status: "",
  });
  
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const imgRef = useRef(null);

  // 1. Fetch ALL available maps
  useEffect(() => {
    fetch("/api/flood/images")
      .then((res) => res.json())
      .then((data) => {
        setAvailableMaps(data);
        if (data.length > 0) {
            setSelectedMap(data[0]); // Default to the first one
        }
        setLoadingImg(false);
      })
      .catch((err) => {
        console.error("Failed to load maps:", err);
        setLoadingImg(false);
      });
  }, []);

  // 2. Handle Map Click
  const handleMapClick = (e) => {
    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let naturalX = Math.round(clickX * scaleX);
    let naturalY = Math.round(clickY * scaleY);

    naturalX = Math.max(0, Math.min(img.naturalWidth - 1, naturalX));
    naturalY = Math.max(0, Math.min(img.naturalHeight - 1, naturalY));

    setUserLocation([naturalX, naturalY]);
  };

  // 3. Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userLocation) {
      alert("Please click on the map to pin your location.");
      return;
    }
    if (!selectedMap) {
        alert("No active map selected.");
        return;
    }

    setSubmitting(true);
    try {
      const payload = {
        userLocation,
        mapFilename: selectedMap.filename, // Send the filename!
        details: {
            ...details,
            notes: `Injuries: ${details.injuries || 'None'}. Situation: ${details.status}`
        }
      };

      const res = await fetch("/api/rescue/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.error || "Failed to send request."}`);
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#050816] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="bg-slate-900 border border-emerald-500/50 p-8 rounded-3xl max-w-lg w-full shadow-2xl">
            <CheckCircle size={80} className="text-emerald-500 mb-6 mx-auto" />
            <h1 className="text-3xl font-bold text-white mb-4">Request Sent!</h1>
            <p className="text-lg text-slate-300 mb-8">
              Coordinates: <span className="font-mono text-emerald-400">[{userLocation[0]}, {userLocation[1]}]</span><br/>
              Map Region: <span className="text-emerald-400">{selectedMap?.filename}</span>
            </p>
            <Link to="/" className="inline-block w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 rounded-xl transition">Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100 flex flex-col md:flex-row overflow-hidden">
      
      {/* LEFT: Map Area */}
      <div className="flex-1 relative bg-black/40 flex flex-col">
         <Link to="/" className="absolute top-6 left-6 z-20 bg-black/60 backdrop-blur p-3 rounded-full hover:bg-black/80 transition text-white border border-slate-700">
          <ArrowLeft size={20} />
        </Link>
        
        {/* Region Selector */}
        {availableMaps.length > 1 && (
             <div className="absolute top-6 left-20 z-20 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-full px-4 py-2 flex items-center gap-2 shadow-xl">
                 <Layers size={14} className="text-emerald-400"/>
                 <span className="text-xs text-slate-400 uppercase font-bold tracking-wide">Region:</span>
                 <select 
                    className="bg-transparent text-white text-sm focus:outline-none cursor-pointer font-semibold min-w-[100px]"
                    onChange={(e) => {
                        const map = availableMaps.find(m => m.filename === e.target.value);
                        setSelectedMap(map);
                        setUserLocation(null);
                    }}
                    value={selectedMap?.filename || ""}
                 >
                     {availableMaps.map(m => (
                         <option key={m.filename} value={m.filename} className="bg-slate-900 text-white">
                            {m.filename}
                         </option>
                     ))}
                 </select>
             </div>
         )}
        
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
            {loadingImg ? (
                <div className="text-slate-500 animate-pulse">Loading map data...</div>
            ) : selectedMap ? (
                <div className="relative inline-block shadow-2xl border border-slate-800 rounded-lg overflow-hidden">
                    <img 
                        ref={imgRef}
                        src={selectedMap.url} 
                        alt="Region Map" 
                        onClick={handleMapClick}
                        className="block max-w-full max-h-[85vh] w-auto h-auto object-contain cursor-crosshair"
                    />
                    
                    {userLocation && imgRef.current && (
                        <div 
                            className="absolute w-6 h-6 bg-red-600 border-2 border-white rounded-full shadow-[0_0_15px_rgba(255,0,0,0.5)] animate-bounce pointer-events-none z-10"
                            style={{ 
                                left: `${(userLocation[0] / imgRef.current.naturalWidth) * 100}%`, 
                                top: `${(userLocation[1] / imgRef.current.naturalHeight) * 100}%`,
                                transform: 'translate(-50%, -100%)'
                            }} 
                        />
                    )}
                </div>
            ) : (
                <div className="text-center max-w-sm">
                    <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                    <p className="text-red-400">No active maps found.</p>
                </div>
            )}
        </div>
      </div>

      {/* RIGHT: Form Area */}
      <div className="w-full md:w-[450px] bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl z-30">
        <div className="p-8 overflow-y-auto flex-1">
            <h1 className="text-3xl font-bold mb-2 text-red-500 flex items-center gap-2">
                <AlertTriangle /> Rescue Request
            </h1>
            <p className="text-slate-400 mb-8 text-sm">
                Mark your location on the map. Ensure the correct "Region" is selected above.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-500">Name</label>
                    <input required className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-red-500 focus:outline-none" 
                        placeholder="John Doe" value={details.name} onChange={e => setDetails({...details, name: e.target.value})} />
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-500">People Count</label>
                    <input type="number" min="1" required className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-red-500 focus:outline-none" 
                        value={details.peopleCount} onChange={e => setDetails({...details, peopleCount: parseInt(e.target.value) || 1})} />
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-500">Injuries</label>
                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-red-500 focus:outline-none" 
                        placeholder="None" value={details.injuries} onChange={e => setDetails({...details, injuries: e.target.value})} />
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-500">Urgent Needs</label>
                    <textarea required rows="4" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-red-500 focus:outline-none" 
                        placeholder="Trapped, water rising..." value={details.status} onChange={e => setDetails({...details, status: e.target.value})} />
                </div>

                <div className="pt-4 sticky bottom-0 bg-slate-950 pb-4">
                    <button disabled={submitting} className={`w-full font-bold py-5 rounded-2xl text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${!userLocation ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white"}`}>
                        {submitting ? "Sending..." : !userLocation ? "Tap Map to Enable" : "🚨 SEND SOS"}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;