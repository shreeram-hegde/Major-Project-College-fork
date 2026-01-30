import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { validateEmail } from "../../utils/helper";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosInstance";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isHoveringLogin, setIsHoveringLogin] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // keep a subtle animated accent for brand consistency
  const [colorPhase, setColorPhase] = useState(0);
  useEffect(() => {
    const interval = setInterval(
      () => setColorPhase((p) => (p + 1) % 360),
      80
    );
    return () => clearInterval(interval);
  }, []);

  const getAccentStyle = () => {
    const hue = colorPhase;
    return {
      background: `linear-gradient(135deg,
        hsl(${hue}, 70%, 55%) 0%,
        hsl(${(hue + 60) % 360}, 70%, 55%) 50%,
        hsl(${(hue + 120) % 360}, 70%, 55%) 100%)`,
    };
  };

  // Handle login form submit
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    setError("");

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email,
        password,
      });
      const { token } = response.data;
      if (token) {
        localStorage.setItem("token", token);
        toast.success("Login successful!");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error(error);
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
        toast.error(error.response.data.message);
      } else {
        setError("An error occurred while logging in. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] p-6 md:p-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl flex items-center justify-center shadow-lg" style={getAccentStyle()}>
              <span className="text-white text-xl font-semibold">F</span>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">
              Sign in to your account
            </h1>
            <p className="mt-2 text-xs md:text-sm text-slate-400">
              Use your registered email and password to access the flood
              evacuation planner.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-9 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember / forgot */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-0"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-xs mt-1">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              onMouseEnter={() => setIsHoveringLogin(true)}
              onMouseLeave={() => setIsHoveringLogin(false)}
              className={`mt-2 w-full py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-600 shadow-lg shadow-emerald-900/40 transition-transform ${
                isHoveringLogin ? "scale-[1.02]" : "scale-100"
              }`}
            >
              Sign in
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 flex items-center gap-3 text-xs text-slate-500">
            <div className="flex-1 h-px bg-slate-800" />
            <span>or</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Sign up link */}
          <p className="mt-4 text-xs md:text-sm text-center text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
