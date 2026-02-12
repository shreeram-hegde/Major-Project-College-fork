// pages/RescuerDashboard.jsx
import { useState, useEffect } from 'react';

const RescuerDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [pathData, setPathData] = useState(null);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    const res = await fetch('/api/rescue/requests');
    const data = await res.json();
    setRequests(data);
  };

  const assignRequest = async (requestId) => {
    await fetch(`/api/rescue/assign/${requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rescuerLocation: myLocation }),
    });
    fetchPendingRequests();
  };

  const computePath = async () => {
    if (!myLocation || !selectedRequest) return;
    
    const res = await fetch('/api/rescue/path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rescuerLocation: myLocation,
        victimLocation: selectedRequest.userLocation,
        victimDetails: selectedRequest.details,
      }),
    });
    
    const data = await res.json();
    setPathData(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-gray-900 text-center mb-12">
          Rescue Operations Dashboard
        </h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: My Position + Pending Requests */}
          <div>
            <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-6">My Current Position</h2>
              <MapComponent onLocationSelect={setMyLocation} />
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                Pending Requests ({requests.length})
                <button 
                  onClick={fetchPendingRequests}
                  className="ml-4 px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  Refresh
                </button>
              </h2>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {requests.map((req) => (
                  <RequestCard
                    key={req._id}
                    request={req}
                    onAssign={assignRequest}
                    onSelect={setSelectedRequest}
                    isSelected={selectedRequest?._id === req._id}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Selected Request + Path Preview */}
          <div>
            {selectedRequest ? (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl shadow-xl p-8">
                  <h2 className="text-2xl font-bold mb-6">Selected: {selectedRequest.details.name}</h2>
                  <VictimPreview victim={selectedRequest} />
                  
                  <MapComponent 
                    locations={[myLocation, selectedRequest.userLocation]}
                    rescuerLoc={myLocation}
                    victimLoc={selectedRequest.userLocation}
                  />
                  
                  <button 
                    onClick={computePath}
                    className="w-full mt-6 bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700"
                  >
                    Compute Safe Path to Victim
                  </button>
                </div>

                {pathData && (
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8">
                    <h3 className="text-xl font-bold mb-4 text-emerald-800">
                      ✅ Path Computed Successfully
                    </h3>
                    <div className="text-sm space-y-2 mb-4">
                      <p>Path length: <strong>{pathData.path?.length || 0}</strong> steps</p>
                      <p>Conclusion: <strong>{pathData.conclusion}</strong></p>
                    </div>
                    <button 
                      onClick={() => navigate(`/dashboard/rescuer/results?requestId=${selectedRequest._id}`)}
                      className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold"
                    >
                      View Full Results & Agent Reasoning
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full bg-white rounded-3xl shadow-xl flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <ImageIcon size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-xl font-medium">Select a rescue request</p>
                  <p className="text-sm">Click any request above to see path options</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
