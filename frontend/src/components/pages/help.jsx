// pages/Help.jsx
import { useState } from 'react';
import { MapComponent } from '../components/Map';

const HelpPage = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [details, setDetails] = useState({
    name: '',
    peopleCount: 1,
    injuries: '',
    status: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!userLocation) return alert('Please pin your location first');
    
    try {
      const res = await fetch('/api/rescue/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userLocation, details }),
      });
      
      if (res.ok) {
        setSubmitted(true);
      }
    } catch (err) {
      alert('Failed to submit request');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-gray-900 text-center mb-12">
          Need Rescue Help?
        </h1>
        
        {submitted ? (
          <div className="bg-emerald-100 border border-emerald-400 text-emerald-800 px-8 py-12 rounded-3xl text-center">
            <h2 className="text-3xl font-bold mb-4">✅ Request Submitted!</h2>
            <p className="text-xl mb-8">Rescue teams have been notified. Stay safe.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold text-lg"
            >
              Submit Another Request
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl p-12">
            <h2 className="text-3xl font-bold mb-8 text-gray-800">
              1. Pin Your Exact Location
            </h2>
            <MapComponent 
              onLocationSelect={setUserLocation}
              height="400px"
              className="rounded-2xl overflow-hidden mb-8"
            />
            
            {userLocation && (
              <div className="bg-yellow-100 border border-yellow-300 p-4 rounded-xl mb-8">
                📍 Your location: <strong>{userLocation.join(', ')}</strong>
              </div>
            )}

            <h2 className="text-3xl font-bold mb-8 text-gray-800">
              2. Provide Details
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <input 
                placeholder="Name / Group leader"
                value={details.name}
                onChange={(e) => setDetails({...details, name: e.target.value})}
                className="w-full p-4 border border-gray-300 rounded-xl text-lg"
              />
              <input 
                type="number"
                placeholder="# of people"
                value={details.peopleCount}
                onChange={(e) => setDetails({...details, peopleCount: parseInt(e.target.value)})}
                className="w-full p-4 border border-gray-300 rounded-xl text-lg"
              />
              <textarea 
                placeholder="Injuries? Status? Urgent notes?"
                value={details.status}
                onChange={(e) => setDetails({...details, status: e.target.value})}
                rows={3}
                className="w-full p-4 border border-gray-300 rounded-xl text-lg md:col-span-2"
              />
            </div>

            <button 
              onClick={handleSubmit}
              disabled={!userLocation}
              className="w-full mt-12 bg-red-600 text-white py-6 rounded-3xl font-bold text-2xl hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              🚨 SEND RESCUE REQUEST NOW
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpPage;
