import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Navigation, Trash2, Upload, Layers, AlertCircle, CheckSquare, Square } from "lucide-react";
import toast from "react-hot-toast";

const RescuerDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [selectedRequests, setSelectedRequests] = useState([]); // Array for multi-select
  
  // Map Management State
  const [availableMaps, setAvailableMaps] = useState([]);
  const [currentMap, setCurrentMap] = useState(null); 
  const [showManager, setShowManager] = useState(false);
  
  const [pathImage, setPathImage] = useState(null);
  const [loadingPath, setLoadingPath] = useState(false);
  
  const imgRef = useRef(null);
  const navigate = useNavigate();

  // 1. Initial Load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
        toast.error("Rescuers must log in.");
        navigate("/login");
        return;
    }
    refreshData(token);
  }, [navigate]);

  const refreshData = (token) => {
    fetch("/api/rescue/requests", { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.json())
    .then(data => { if(Array.isArray(data)) setRequests(data); });

    fetch("/api/flood/images")
    .then(res => res.json())
    .then(data => {
        setAvailableMaps(data);
        if(data.length > 0 && !currentMap) setCurrentMap(data[0]);
    });
  };

  // 2. Toggle Request Selection (Multi-Select)
  const handleToggleRequest = (req) => {
    // If selecting a request on a DIFFERENT map, confirm before clearing current selections
    if (selectedRequests.length > 0 && selectedRequests[0].mapFilename !== req.mapFilename) {
        if(window.confirm("This request is on a different map. Switch maps and clear current selections?")) {
            setSelectedRequests([req]);
            const matchingMap = availableMaps.find(m => m.filename === req.mapFilename);
            setCurrentMap(matchingMap);
            setPathImage(null);
            setMyLocation(null);
        }
        return;
    }

    // Ensure we are on the right map
    if (!currentMap || currentMap.filename !== req.mapFilename) {
        setCurrentMap(availableMaps.find(m => m.filename === req.mapFilename));
    }

    // Toggle selection
    const isSelected = selectedRequests.some(r => r._id === req._id);
    if (isSelected) {
        setSelectedRequests(prev => prev.filter(r => r._id !== req._id));
    } else {
        setSelectedRequests(prev => [...prev, req]);
    }
    
    setPathImage(null); // Clear previous path when selection changes
  };

  // 3. Compute Path using the Upgraded Multi-Path Backend
  const handleComputeRescue = async () => {
    if(!myLocation || selectedRequests.length === 0) return;
    setLoadingPath(true);
    const token = localStorage.getItem("token");

    // Extract all victim locations into the 'goals' array format
    const goalsArray = selectedRequests.map(req => req.userLocation);

    try {
        // Calling our newly upgraded ML route!
        const res = await fetch("/api/flood/path", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                start: myLocation,
                goals: goalsArray,
                imagePath: currentMap.filename 
            })
        });
        const data = await res.json();
        if(data.image) setPathImage(data.image);
        else toast.error("No path found.");
    } catch (err) { toast.error("Calculation failed."); } 
    finally { setLoadingPath(false); }
  };

  // 4. Resolve ALL Selected Requests
  const handleResolveSelected = async () => {
    if(!window.confirm(`Mark all ${selectedRequests.length} selected request(s) as resolved?`)) return;
    const token = localStorage.getItem("token");
    
    try {
        for (const req of selectedRequests) {
            await fetch(`/api/rescue/request/${req._id}`, { 
                method: "DELETE", 
                headers: { Authorization: `Bearer ${token}` } 
            });
        }
        toast.success("Rescues resolved!");
        setRequests(prev => prev.filter(req => !selectedRequests.find(sel => sel._id === req._id)));
        setSelectedRequests([]);
        setPathImage(null);
    } catch (err) {
        toast.error("Failed to resolve some requests.");
    }
  };

  // 5. Map Manager Actions
  const handleDeleteMap = async (filename) => {
    if(!window.confirm("Delete map? Old requests using this map might break.")) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/upload/image/${filename}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if(res.ok) {
        toast.success("Map deleted");
        refreshData(token);
    }
  };

  const handleUploadMap = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const formData = new FormData();
    formData.append("image", file);
    
    const res = await fetch("/api/upload/flood-image", { method: "POST", body: formData });
    if(res.ok) {
        toast.success("Map uploaded!");
        refreshData(localStorage.getItem("token"));
    } else {
        toast.error("Upload failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100 flex flex-col h-screen overflow-hidden">
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
            <Link to="/dashboard" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"><ArrowLeft size={18} /></Link>
            <h1 className="text-xl font-bold text-emerald-400 flex items-center gap-2"><Users size={24} /> Rescuer Command</h1>
        </div>
        <button onClick={() => setShowManager(!showManager)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${showManager ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
            <Layers size={16} /> {showManager ? "Close Manager" : "Manage Maps"}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-80 md:w-96 bg-slate-900 border-r border-slate-800 overflow-y-auto p-4 shrink-0">
             {showManager ? (
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Map Manager</h2>
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-xl hover:border-emerald-500 hover:bg-slate-800 cursor-pointer transition">
                        <Upload size={24} className="text-emerald-500 mb-2"/>
                        <span className="text-xs text-slate-300">Upload New Map Image</span>
                        <input type="file" className="hidden" onChange={handleUploadMap} accept="image/*" />
                    </label>
                    <div className="space-y-2">
                        {availableMaps.map(map => (
                            <div key={map.filename} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                                <div className="flex items-center gap-2 truncate">
                                    <Layers size={14} className="text-slate-500"/>
                                    <span className="text-xs truncate max-w-[150px]">{map.filename}</span>
                                </div>
                                <button onClick={() => handleDeleteMap(map.filename)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-md transition"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Active Alerts ({requests.length})</h2>
                        {selectedRequests.length > 0 && (
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold">
                                {selectedRequests.length} Selected
                            </span>
                        )}
                    </div>

                    {requests.length === 0 && <div className="p-4 text-center text-slate-600 border border-slate-800 border-dashed rounded-lg">No active alerts</div>}
                    
                    {requests.map(req => {
                        const isSelected = selectedRequests.some(r => r._id === req._id);
                        return (
                            <div 
                                key={req._id} 
                                onClick={() => handleToggleRequest(req)} 
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex gap-3 items-start ${isSelected ? 'bg-emerald-500/10 border-emerald-500 shadow-lg' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
                            >
                                <div className="mt-1">
                                    {isSelected ? <CheckSquare size={18} className="text-emerald-400" /> : <Square size={18} className="text-slate-500" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1 items-center">
                                        <span className="font-bold text-slate-100">{req.details?.name}</span>
                                        <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full uppercase font-bold">{req.details?.peopleCount} PPL</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mb-2 line-clamp-2">{req.details?.notes}</div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-900/50 px-2 py-1 rounded w-fit">
                                        <Layers size={10} /> {req.mapFilename}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* MAIN AREA */}
        <div className="flex-1 flex flex-col p-4 bg-black/30 relative">
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl mb-4 flex justify-between items-center shadow-lg">
                <div className="text-sm text-slate-300 flex items-center gap-2">
                    Active Map: <span className="text-emerald-400 font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-600">{currentMap?.filename || "None"}</span>
                </div>
                {selectedRequests.length > 0 && !showManager && (
                    <div className="flex gap-2">
                        <button onClick={handleResolveSelected} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-sm font-semibold border border-red-500/30">
                            Resolve Selected ({selectedRequests.length})
                        </button>
                        <button onClick={handleComputeRescue} disabled={loadingPath || !myLocation} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                            <Navigation size={14}/> {loadingPath ? "Computing..." : "Route to All"}
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden relative shadow-2xl">
                {currentMap ? (
                     <div className="relative inline-block">
                        <img 
                            ref={imgRef}
                            src={pathImage ? `data:image/png;base64,${pathImage}` : currentMap.url}
                            className="max-h-[75vh] object-contain cursor-crosshair"
                            onClick={(e) => {
                                if(imgRef.current && !pathImage) {
                                    const rect = imgRef.current.getBoundingClientRect();
                                    const scaleX = imgRef.current.naturalWidth / rect.width;
                                    const scaleY = imgRef.current.naturalHeight / rect.height;
                                    const x = Math.round((e.clientX - rect.left) * scaleX);
                                    const y = Math.round((e.clientY - rect.top) * scaleY);
                                    setMyLocation([x, y]);
                                }
                            }}
                        />
                        
                        {/* Multiple Victim Markers */}
                        {!pathImage && selectedRequests.map((req, i) => (
                            <div key={req._id} className="absolute w-4 h-4 bg-red-500 rounded-full border border-white animate-pulse shadow-[0_0_10px_red]"
                                style={{
                                    left: `${(req.userLocation[0] / imgRef.current?.naturalWidth) * 100}%`,
                                    top: `${(req.userLocation[1] / imgRef.current?.naturalHeight) * 100}%`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            >
                                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-black text-white px-1 rounded">{i+1}</span>
                            </div>
                        ))}

                         {/* Rescuer Marker */}
                         {myLocation && !pathImage && (
                            <div className="absolute w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_10px_lime]"
                                style={{
                                    left: `${(myLocation[0] / imgRef.current?.naturalWidth) * 100}%`,
                                    top: `${(myLocation[1] / imgRef.current?.naturalHeight) * 100}%`,
                                    transform: 'translate(-50%, -100%)'
                                }}
                            />
                        )}
                    </div>
                ) : (
                    <div className="text-center">
                        <AlertCircle size={48} className="text-slate-600 mx-auto mb-4"/>
                        <p className="text-slate-500">No active map selected.</p>
                        <p className="text-xs text-slate-600 mt-2">Upload one in "Manage Maps"</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default RescuerDashboard;