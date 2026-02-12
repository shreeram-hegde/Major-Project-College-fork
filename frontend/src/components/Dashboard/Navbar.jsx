// Navbar.jsx
import React from "react";
import toast from 'react-hot-toast';
import { Link } from "react-router-dom";
import {useNavigate} from "react-router-dom";
import { LogOut, Settings, User } from "lucide-react";

const Navbar = () => {

    const navigate = useNavigate();
    const handleLogout = async (e) =>{
    e.preventDefault();
    try{
      // const response = await axios.post("/logout");
      localStorage.removeItem("token");
      toast.success("Logout successful!");
      navigate("/");
    }catch(err){
      console.log("logout failed", err);
    }
  }
  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
      {/* Logo / Title */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-500 w-8 h-8 flex items-center justify-center rounded-lg font-bold text-white">
          D
        </div>
        <h1 className="text-xl font-semibold tracking-wide">Dashboard</h1>
      </div>

      
      <Link to="/help" className="hover:text-red-400 transition p-2">
        🚨 Help
      </Link>
      <Link to="/rescuers" className="hover:text-emerald-400 transition p-2">
        🛡️ Rescuers
      </Link>


      {/* Right Side - Profile */}
      <div className="flex items-center gap-5">
        <button className="hover:text-blue-400 transition">
          <Settings size={22} />
        </button>
        <button className="hover:text-blue-400 transition">
          <User size={22} />
        </button>
        <button 
        
        className="hover:text-red-400 transition">
          <LogOut onClick={handleLogout} size={22} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
