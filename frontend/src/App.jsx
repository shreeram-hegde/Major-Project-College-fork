import React from "react";
import { Route, Routes } from "react-router-dom";
import Dashboard from "./components/Dashboard/Dashboard";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import Results from "./components/Dashboard/Results";
import { Toaster } from "react-hot-toast";
import Landing from "./components/LandingPage";
import Help from "./components/pages/Help"; // Capitalized
import RescuerDashboard from "./components/pages/RescuerDashboard";

function App() {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/help" element={<Help />} /> {/* Capitalized */}
        <Route path="/rescuers" element={<RescuerDashboard />} />
        <Route path="/dashboard/results" element={<Results />} /> {/* Fixed Syntax */}
      </Routes>
    </>
  );
}

export default App;